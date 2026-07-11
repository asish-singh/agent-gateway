import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { GatewayStore } from '../index/store.js'
import { createGatewayServer } from './gateway-server.js'

export interface HttpServeOptions {
  baseDir: string
  port: number
  host?: string
  /** Bearer token required on every MCP request. When absent the server is open. */
  token?: string
  /** Serve only these hostnames. When absent, every built gateway in baseDir is served. */
  gateways?: string[]
}

function discoverGateways(baseDir: string, only?: string[]): Map<string, string> {
  const found = new Map<string, string>()
  const names = only ?? (existsSync(baseDir) ? readdirSync(baseDir) : [])
  for (const name of names) {
    const dbPath = join(baseDir, name, 'index.sqlite')
    if (existsSync(dbPath)) found.set(name, dbPath)
  }
  return found
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      if (!data) return resolve(undefined)
      try {
        resolve(JSON.parse(data))
      } catch {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function deny(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ error: message }))
}

/**
 * Serve every built gateway over streamable HTTP, one path per site:
 * POST /<hostname>/mcp. Stateless mode: each request gets a fresh server
 * and transport over a shared read-only store, so no session bookkeeping
 * is needed and any instance can be restarted freely.
 */
export function startHttpServer(options: HttpServeOptions): { server: Server; gateways: string[] } {
  const stores = new Map<string, GatewayStore>()
  for (const [name, dbPath] of discoverGateways(options.baseDir, options.gateways)) {
    stores.set(name, new GatewayStore(dbPath))
  }
  if (stores.size === 0) {
    throw new Error(`No built gateways found in ${options.baseDir}. Run agent-gateway build first.`)
  }

  const server = createServer((req, res) => {
    void handle(req, res).catch((err) => {
      if (!res.headersSent) deny(res, 500, err instanceof Error ? err.message : 'internal error')
    })
  })

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost')

    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname

    if (pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, gateways: [...stores.keys()] }))
      return
    }

    if (pathname === '/') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify(
          {
            service: 'agent-gateway',
            note: 'This is an MCP API for AI assistants, not a website. Connect an MCP client over streamable HTTP to one of the endpoints below.',
            endpoints: [...stores.keys()].map((g) => `/${g}/mcp`),
          },
          null,
          2,
        ),
      )
      return
    }

    const match = /^\/([^/]+)\/mcp$/.exec(pathname)
    if (!match) return deny(res, 404, `not found; MCP endpoints live at /<hostname>/mcp, currently ${[...stores.keys()].map((g) => `/${g}/mcp`).join(' ')}`)
    const store = stores.get(match[1] as string)
    if (!store) return deny(res, 404, `no gateway named ${match[1]}`)

    if (options.token) {
      const auth = req.headers.authorization ?? ''
      if (auth !== `Bearer ${options.token}`) return deny(res, 401, 'missing or wrong bearer token')
    }

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    const mcp = createGatewayServer(store)
    res.on('close', () => {
      void transport.close()
      void mcp.close()
    })
    await mcp.connect(transport)
    await transport.handleRequest(req, res, await readBody(req))
  }

  server.listen(options.port, options.host ?? '127.0.0.1')
  return { server, gateways: [...stores.keys()] }
}

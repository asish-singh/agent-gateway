import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { GatewayStore } from '../src/index/store.js'
import { startHttpServer } from '../src/server/http.js'

const TOKEN = 'test-token-123'
let baseDir: string
let server: Server
let baseUrl: string

beforeAll(async () => {
  baseDir = mkdtempSync(join(tmpdir(), 'gateway-http-'))
  const dir = join(baseDir, 'example-studio.test')
  mkdirSync(dir, { recursive: true })
  const store = new GatewayStore(join(dir, 'index.sqlite'))
  store.replaceAllPages([
    {
      url: 'https://example-studio.test/services',
      title: 'Services',
      description: 'What we offer',
      headings: ['Lighthouse design'],
      markdown: 'Complete lighthouse architecture. Annual fresnel lens polishing.',
      links: [],
    },
  ])
  store.setSiteInfo({
    name: 'Example Studio',
    description: 'Lighthouse design studio',
    contact: { emails: [], phones: [] },
    keyPages: {},
  })
  store.close()

  const started = startHttpServer({ baseDir, port: 0, token: TOKEN })
  server = started.server
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const addr = server.address()
  const port = typeof addr === 'object' && addr ? addr.port : 0
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server.close()
  rmSync(baseDir, { recursive: true, force: true })
})

describe('gateway HTTP server', () => {
  it('reports served gateways on /healthz', async () => {
    const res = await fetch(`${baseUrl}/healthz`)
    expect(res.status).toBe(200)
    expect((await res.json()).gateways).toContain('example-studio.test')
  })

  it('rejects requests without the bearer token', async () => {
    const res = await fetch(`${baseUrl}/example-studio.test/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown gateways', async () => {
    const res = await fetch(`${baseUrl}/nope.example/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }),
    })
    expect(res.status).toBe(404)
  })

  it('serves a full MCP session over streamable HTTP with the token', async () => {
    const client = new Client({ name: 'http-test', version: '0' })
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/example-studio.test/mcp`), {
      requestInit: { headers: { authorization: `Bearer ${TOKEN}` } },
    })
    await client.connect(transport)
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name)).toContain('search_site')
    const result = await client.callTool({ name: 'search_site', arguments: { query: 'fresnel' } })
    const text = (result.content as { text?: string }[]).map((c) => c.text ?? '').join('')
    expect(text).toContain('https://example-studio.test/services')
    await client.close()
  })
})

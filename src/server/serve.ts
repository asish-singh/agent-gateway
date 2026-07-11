import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { GatewayStore } from '../index/store.js'
import { createGatewayServer } from './gateway-server.js'

export function resolveGatewayDb(baseDir: string, gateway: string): string {
  // Accept a hostname ("example.com"), a URL, or a direct path to a gateway dir.
  const hostname = gateway.includes('://') ? new URL(gateway).hostname : gateway
  for (const candidate of [join(baseDir, hostname, 'index.sqlite'), join(gateway, 'index.sqlite')]) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error(`No gateway found for "${gateway}". Run agent-gateway build first. Looked in ${join(baseDir, hostname)}.`)
}

/** Serve one gateway over stdio, for local use from Claude Code and other MCP clients. */
export async function serveStdio(dbPath: string): Promise<void> {
  const store = new GatewayStore(dbPath)
  const server = createGatewayServer(store)
  await server.connect(new StdioServerTransport())
  console.error(`agent-gateway serving ${dbPath} over stdio`)
}

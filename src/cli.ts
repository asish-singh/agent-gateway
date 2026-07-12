#!/usr/bin/env node
import { Command } from 'commander'
import { buildGateway } from './build.js'

const program = new Command()

program
  .name('mcp-site-gateway')
  .description('Turn any existing website into a working MCP server so AI assistants can search and use it, not just read it.')
  .version('0.1.0')

program
  .command('build')
  .argument('<url>', 'website to crawl, e.g. https://example.com')
  .option('--out <dir>', 'base output directory', 'gateways')
  .option('--max-pages <n>', 'page cap', '500')
  .option('--interval <ms>', 'milliseconds between requests', '1000')
  .description('Crawl a site and build its searchable gateway index')
  .action(async (url: string, opts: { out: string; maxPages: string; interval: string }) => {
    const result = await buildGateway(url, opts.out, {
      maxPages: Number(opts.maxPages),
      requestIntervalMs: Number(opts.interval),
    })
    console.log(JSON.stringify({ dir: result.dir, pages: result.report.pagesCrawled, skipped: result.report.skipped.length }, null, 2))
  })

program
  .command('refresh')
  .argument('<url>', 'website whose gateway should be rebuilt')
  .option('--out <dir>', 'base output directory', 'gateways')
  .description('Re-crawl a site and rebuild its index in place')
  .action(async (url: string, opts: { out: string }) => {
    const result = await buildGateway(url, opts.out)
    console.log(JSON.stringify({ dir: result.dir, pages: result.report.pagesCrawled }, null, 2))
  })

program
  .command('manifest')
  .argument('<gateway>', 'hostname of a built gateway, e.g. example.com')
  .option('--out <dir>', 'base directory holding built gateways', 'gateways')
  .option('--endpoint <url>', 'public MCP endpoint to advertise, e.g. https://gateway.example.com/example.com/mcp')
  .description('Generate agents.json and llms.txt for the site owner to host')
  .action(async (gateway: string, opts: { out: string; endpoint?: string }) => {
    const { writeManifests } = await import('./manifest.js')
    const { dirname } = await import('node:path')
    const { resolveGatewayDb } = await import('./server/serve.js')
    const dir = dirname(resolveGatewayDb(opts.out, gateway))
    writeManifests(dir, opts.endpoint ? { endpoint: opts.endpoint } : {})
    console.log(`wrote ${dir}/agents.json and ${dir}/llms.txt`)
  })

program
  .command('serve')
  .argument('[gateway]', 'hostname of a built gateway, e.g. example.com; omit with --http to serve all')
  .option('--out <dir>', 'base directory holding built gateways', 'gateways')
  .option('--http <port>', 'serve over HTTP on this port instead of stdio')
  .option('--host <host>', 'HTTP bind address', '127.0.0.1')
  .option('--token <token>', 'require this bearer token on HTTP requests (or set AGENT_GATEWAY_TOKEN)')
  .description('Serve built gateways as MCP servers, stdio for one site or HTTP for many')
  .action(async (gateway: string | undefined, opts: { out: string; http?: string; host: string; token?: string }) => {
    if (opts.http) {
      const { startHttpServer } = await import('./server/http.js')
      const token = opts.token ?? process.env['AGENT_GATEWAY_TOKEN']
      const { gateways } = startHttpServer({
        baseDir: opts.out,
        port: Number(opts.http),
        host: opts.host,
        ...(token ? { token } : {}),
        ...(gateway ? { gateways: [gateway.includes('://') ? new URL(gateway).hostname : gateway] } : {}),
      })
      console.error(
        `mcp-site-gateway serving ${gateways.length} gateway(s) on http://${opts.host}:${opts.http}, endpoints ${gateways.map((g) => `/${g}/mcp`).join(' ')}${token ? ', bearer token required' : ', open access'}`,
      )
      return
    }
    if (!gateway) throw new Error('a gateway hostname is required for stdio mode')
    const { resolveGatewayDb, serveStdio } = await import('./server/serve.js')
    await serveStdio(resolveGatewayDb(opts.out, gateway))
  })

program.parseAsync().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

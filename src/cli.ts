#!/usr/bin/env node
import { Command } from 'commander'
import { buildGateway } from './build.js'

const program = new Command()

program
  .name('agent-gateway')
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

program.parseAsync().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { crawlSite } from './crawler/crawl.js'
import { GatewayStore } from './index/store.js'
import { deriveSiteInfo } from './siteinfo.js'
import type { CrawlOptions, CrawlReport } from './types.js'

export interface BuildResult {
  dir: string
  dbPath: string
  report: CrawlReport
}

export function gatewayDirFor(baseDir: string, url: string): string {
  return join(baseDir, new URL(url).hostname)
}

/**
 * Crawl a site and produce gateways/<hostname>/ with the SQLite index,
 * a JSON crawl report, and the site info the server will expose.
 */
export async function buildGateway(
  startUrl: string,
  baseDir = 'gateways',
  options: Partial<CrawlOptions> = {},
  log: (msg: string) => void = console.error,
): Promise<BuildResult> {
  const dir = gatewayDirFor(baseDir, startUrl)
  mkdirSync(dir, { recursive: true })

  const { pages, report } = await crawlSite(startUrl, options, log)
  if (pages.length === 0) {
    throw new Error(`Crawl of ${startUrl} produced no pages. See skipped reasons: ${JSON.stringify(report.skipped.slice(0, 5))}`)
  }

  const dbPath = join(dir, 'index.sqlite')
  // Rebuild from scratch so a refresh never leaves stale rows behind.
  if (existsSync(dbPath)) rmSync(dbPath)
  const store = new GatewayStore(dbPath)
  store.replaceAllPages(pages)
  store.setSiteInfo(deriveSiteInfo(startUrl, pages))
  store.setCrawlReport(report)
  store.close()

  writeFileSync(join(dir, 'crawl-report.json'), JSON.stringify(report, null, 2))
  log(`built gateway for ${startUrl}: ${pages.length} pages, ${report.skipped.length} skipped, db at ${dbPath}`)
  return { dir, dbPath, report }
}

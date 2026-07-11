import { createHash } from 'node:crypto'
import robotsParserImport from 'robots-parser'

// robots-parser ships CommonJS with a type file that misdescribes its export
// shape under NodeNext resolution, so we re-type the callable once here.
interface RobotsChecker {
  isDisallowed(url: string, ua?: string): boolean | undefined
}
const robotsParser = robotsParserImport as unknown as (url: string, txt: string) => RobotsChecker
import { extractPage } from './extract.js'
import { fetchSitemapUrls } from './sitemap.js'
import type { CrawlOptions, CrawlReport, ExtractedPage, SkippedUrl } from '../types.js'
import { DEFAULT_CRAWL_OPTIONS } from '../types.js'

export interface CrawlResult {
  pages: ExtractedPage[]
  report: CrawlReport
}

function normalizeUrl(raw: string): string {
  const u = new URL(raw)
  u.hash = ''
  u.search = ''
  if (u.pathname.endsWith('/') && u.pathname !== '/') {
    u.pathname = u.pathname.slice(0, -1)
  }
  return u.href
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function crawlSite(
  startUrl: string,
  options: Partial<CrawlOptions> = {},
  log: (msg: string) => void = () => {},
): Promise<CrawlResult> {
  const opts: CrawlOptions = { ...DEFAULT_CRAWL_OPTIONS, ...options }
  const started = Date.now()
  const origin = new URL(startUrl).origin

  const headers = { 'user-agent': opts.userAgent, accept: 'text/html,application/xhtml+xml,application/xml' }

  async function fetchRaw(url: string): Promise<Response | null> {
    try {
      return await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(opts.timeoutMs) })
    } catch {
      return null
    }
  }
  async function fetchText(url: string): Promise<string | null> {
    const res = await fetchRaw(url)
    return res?.ok ? await res.text() : null
  }

  const robotsTxt = (await fetchText(`${origin}/robots.txt`)) ?? ''
  const robots = robotsParser(`${origin}/robots.txt`, robotsTxt)

  const sitemapUrls = await fetchSitemapUrls(origin, fetchText)
  const usedSitemap = sitemapUrls.length > 0
  log(usedSitemap ? `sitemap found with ${sitemapUrls.length} urls` : 'no sitemap, following links')

  const queue: string[] = [normalizeUrl(startUrl), ...sitemapUrls.map((u) => normalizeUrl(u))]
  const queued = new Set(queue)
  const skipped: SkippedUrl[] = []
  const contentHashes = new Set<string>()
  const pages: ExtractedPage[] = []
  let lastRequestAt = 0

  while (queue.length > 0) {
    const url = queue.shift() as string

    if (pages.length >= opts.maxPages) {
      skipped.push({ url, reason: 'over-page-cap' })
      continue
    }
    if (robots.isDisallowed(url, opts.userAgent)) {
      skipped.push({ url, reason: 'robots-disallowed' })
      continue
    }

    const wait = lastRequestAt + opts.requestIntervalMs - Date.now()
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()

    const res = await fetchRaw(url)
    if (!res) {
      skipped.push({ url, reason: 'fetch-error' })
      continue
    }
    if (!res.ok) {
      skipped.push({ url, reason: 'http-error' })
      continue
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('html')) {
      skipped.push({ url, reason: 'not-html' })
      continue
    }

    const html = await res.text()
    const page = extractPage(url, html)

    const hash = createHash('sha256').update(page.markdown).digest('hex')
    if (contentHashes.has(hash)) {
      skipped.push({ url, reason: 'duplicate-content' })
      continue
    }
    contentHashes.add(hash)
    pages.push(page)
    log(`crawled ${pages.length}/${opts.maxPages} ${url}`)

    for (const link of page.links) {
      const normalized = normalizeUrl(link)
      if (!queued.has(normalized)) {
        queued.add(normalized)
        queue.push(normalized)
      }
    }
  }

  const report: CrawlReport = {
    startUrl,
    crawledAt: new Date().toISOString(),
    pagesCrawled: pages.length,
    usedSitemap,
    skipped,
    durationMs: Date.now() - started,
  }
  return { pages, report }
}

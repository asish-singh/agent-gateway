export interface CrawlOptions {
  /** Maximum pages to fetch. Anything beyond this is logged as skipped. */
  maxPages: number
  /** Minimum milliseconds between requests to the same host. */
  requestIntervalMs: number
  /** Per request timeout in milliseconds. */
  timeoutMs: number
  userAgent: string
}

export const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  maxPages: 500,
  requestIntervalMs: 1000,
  timeoutMs: 15000,
  userAgent: 'mcp-site-gateway/0.2 (+https://github.com/asish-singh/mcp-site-gateway)',
}

export interface ExtractedPage {
  url: string
  title: string
  description: string
  headings: string[]
  /** Main content converted to markdown, boilerplate stripped. */
  markdown: string
  /** Same-origin links discovered on the page, absolute URLs. */
  links: string[]
}

export interface SkippedUrl {
  url: string
  reason:
    | 'robots-disallowed'
    | 'over-page-cap'
    | 'fetch-error'
    | 'http-error'
    | 'not-html'
    | 'duplicate-content'
}

export interface SiteInfo {
  name: string
  description: string
  contact: {
    emails: string[]
    phones: string[]
  }
  keyPages: Record<string, string>
}

export interface CrawlReport {
  startUrl: string
  crawledAt: string
  pagesCrawled: number
  usedSitemap: boolean
  skipped: SkippedUrl[]
  durationMs: number
}

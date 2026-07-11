import type { ExtractedPage, SiteInfo } from './types.js'

const KEY_PAGE_PATTERNS: Record<string, RegExp> = {
  contact: /contact|get-in-touch/i,
  about: /about/i,
  pricing: /pricing|plans|rates/i,
  services: /services|what-we-do|offerings/i,
  blog: /blog|articles|writing|posts/i,
  booking: /book|schedule|appointment/i,
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_RE = /\+\d[\d\s().-]{7,}\d/g

/** Derive business basics from the crawled pages for the get_site_info tool. */
export function deriveSiteInfo(startUrl: string, pages: ExtractedPage[]): SiteInfo {
  const home =
    pages.find((p) => {
      const path = new URL(p.url).pathname
      return path === '/' || path === ''
    }) ?? pages[0]

  const emails = new Set<string>()
  const phones = new Set<string>()
  const keyPages: Record<string, string> = {}

  for (const page of pages) {
    const path = new URL(page.url).pathname
    for (const [label, pattern] of Object.entries(KEY_PAGE_PATTERNS)) {
      if (!(label in keyPages) && pattern.test(path)) keyPages[label] = page.url
    }
    // Contact details usually surface on contact/about/home pages; scanning all
    // pages is cheap and catches footers that survived extraction.
    for (const m of page.markdown.matchAll(EMAIL_RE)) {
      if (!/\.(png|jpg|svg|webp|gif)$/i.test(m[0])) emails.add(m[0].toLowerCase())
    }
    for (const m of page.markdown.matchAll(PHONE_RE)) phones.add(m[0].replace(/\s+/g, ' ').trim())
  }

  const hostname = new URL(startUrl).hostname
  return {
    name: home?.title || hostname,
    description: home?.description || `Website at ${hostname}`,
    contact: { emails: [...emails].slice(0, 5), phones: [...phones].slice(0, 5) },
    keyPages,
  }
}

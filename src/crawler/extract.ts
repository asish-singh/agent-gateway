import * as cheerio from 'cheerio'
import TurndownService from 'turndown'
import type { ExtractedPage } from '../types.js'

const BOILERPLATE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'iframe',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[aria-hidden="true"]',
  '.cookie-banner',
  '.cookie-consent',
  '#cookie-banner',
  '.skip-link',
]

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})
turndown.remove(['script', 'style'])

/** Pick the most content-bearing container: <main>, <article>, or fall back to <body>. */
function pickMainContainer($: cheerio.CheerioAPI): cheerio.Cheerio<never> {
  for (const sel of ['main', 'article', '[role="main"]', '#content', '#main', 'body']) {
    const el = $(sel).first()
    if (el.length && el.text().trim().length > 0) return el as cheerio.Cheerio<never>
  }
  return $('body') as cheerio.Cheerio<never>
}

export function extractPage(url: string, html: string): ExtractedPage {
  const $ = cheerio.load(html)
  const pageUrl = new URL(url)

  const title =
    $('title').first().text().trim() ||
    $('h1').first().text().trim() ||
    pageUrl.pathname

  const description =
    $('meta[name="description"]').attr('content')?.trim() ??
    $('meta[property="og:description"]').attr('content')?.trim() ??
    ''

  // Collect same-origin links from the full document before stripping boilerplate,
  // since most internal links live in the navigation we are about to remove.
  const links = new Set<string>()
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href')
    if (!href) return
    try {
      const resolved = new URL(href, url)
      resolved.hash = ''
      if (resolved.origin === pageUrl.origin && /^https?:$/.test(resolved.protocol)) {
        links.add(resolved.href)
      }
    } catch {
      /* unparseable href, ignore */
    }
  })

  for (const sel of BOILERPLATE_SELECTORS) $(sel).remove()

  const main = pickMainContainer($)
  const headings: string[] = []
  main.find('h1, h2, h3').each((_, h) => {
    const text = $(h).text().trim()
    if (text) headings.push(text)
  })

  const markdown = turndown
    .turndown($.html(main))
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { url, title, description, headings, markdown, links: [...links] }
}

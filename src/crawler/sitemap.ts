import * as cheerio from 'cheerio'

/**
 * Fetch and flatten a sitemap (following one level of sitemap index nesting).
 * Returns [] when no usable sitemap exists.
 */
export async function fetchSitemapUrls(
  origin: string,
  fetchText: (url: string) => Promise<string | null>,
): Promise<string[]> {
  const seen = new Set<string>()
  const queue = [`${origin}/sitemap.xml`]
  const urls: string[] = []
  let indexDepth = 0

  while (queue.length > 0 && urls.length < 5000) {
    const sitemapUrl = queue.shift() as string
    const xml = await fetchText(sitemapUrl)
    if (!xml) continue
    const $ = cheerio.load(xml, { xml: true })

    $('urlset url loc').each((_, loc) => {
      const u = $(loc).text().trim()
      if (u && !seen.has(u)) {
        seen.add(u)
        urls.push(u)
      }
    })

    if (indexDepth === 0) {
      $('sitemapindex sitemap loc').each((_, loc) => {
        const u = $(loc).text().trim()
        if (u) queue.push(u)
      })
      if (queue.length > 0) indexDepth = 1
    }
  }
  return urls
}

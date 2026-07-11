import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { GatewayStore } from '../index/store.js'

/**
 * Build the generic gateway MCP server for one site. All per-site behavior
 * comes from the store's data (see ADR 0002): tool descriptions name the
 * actual site so assistants know when to pick these tools.
 */
export function createGatewayServer(store: GatewayStore): McpServer {
  const info = store.getSiteInfo()
  const report = store.getCrawlReport()
  const siteName = info?.name ?? 'this website'
  const hostname = report ? new URL(report.startUrl).hostname : 'the site'

  const server = new McpServer({
    name: `gateway-${hostname}`,
    version: '0.1.0',
  })

  server.registerTool(
    'search_site',
    {
      title: `Search ${hostname}`,
      description: `Full text search over the content of ${siteName} (${hostname}). Returns the best matching pages with title, URL, and a relevant excerpt. Reformulate and retry with different words if the first search misses.`,
      inputSchema: {
        query: z.string().min(1).describe('Plain language search query'),
        limit: z.number().int().min(1).max(25).optional().describe('Maximum results, default 8'),
      },
    },
    ({ query, limit }) => {
      const hits = store.search(query, limit ?? 8)
      return {
        content: [
          {
            type: 'text',
            text:
              hits.length === 0
                ? `No pages on ${hostname} matched "${query}". Try different or fewer words, or use list_sections to see what the site contains.`
                : JSON.stringify(hits.map(({ url, title, excerpt }) => ({ url, title, excerpt })), null, 2),
          },
        ],
      }
    },
  )

  server.registerTool(
    'get_page',
    {
      title: `Read a page from ${hostname}`,
      description: `Fetch the full content of one page of ${siteName} as clean markdown. The url must be a page URL from this site, usually found via search_site or list_sections.`,
      inputSchema: { url: z.string().url().describe(`A page URL on ${hostname}`) },
    },
    ({ url }) => {
      const page = store.getPage(url)
      if (!page) {
        const hits = store.search(new URL(url).pathname.split('/').filter(Boolean).join(' '), 3)
        const hint = hits.length > 0 ? ` Closest indexed pages: ${hits.map((h) => h.url).join(', ')}` : ''
        return {
          content: [{ type: 'text', text: `No indexed page at ${url}.${hint}` }],
          isError: true,
        }
      }
      return { content: [{ type: 'text', text: `# ${page.title}\n\nSource: ${page.url}\n\n${page.markdown}` }] }
    },
  )

  server.registerTool(
    'list_sections',
    {
      title: `Sections of ${hostname}`,
      description: `Overview of how ${siteName} is organized. Returns the site's top level sections with page counts and sample titles, useful for orienting before searching.`,
      inputSchema: {},
    },
    () => ({
      content: [{ type: 'text', text: JSON.stringify(store.listSections(), null, 2) }],
    }),
  )

  server.registerTool(
    'get_site_info',
    {
      title: `About ${hostname}`,
      description: `Business basics for ${siteName}: name, description, contact details, and links to key pages such as contact, pricing, or booking. Also reports when the content index was last refreshed.`,
      inputSchema: {},
    },
    () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...info,
              index: report
                ? { pages: store.pageCount(), crawledAt: report.crawledAt, source: report.startUrl }
                : { pages: store.pageCount() },
            },
            null,
            2,
          ),
        },
      ],
    }),
  )

  return server
}

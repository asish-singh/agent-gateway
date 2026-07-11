import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { GatewayStore } from './index/store.js'

export interface ManifestOptions {
  /** Public MCP endpoint for this gateway, e.g. https://gateway.example.com/example.com/mcp */
  endpoint?: string
}

export interface ManifestFiles {
  agentsJson: string
  llmsTxt: string
}

/**
 * Render the two discovery files a site owner hosts at their own domain:
 * /.well-known/agents.json (machine readable) and /llms.txt (agent readable).
 * They advertise what the site is and where its MCP gateway lives.
 */
export function renderManifests(dbPath: string, options: ManifestOptions = {}): ManifestFiles {
  const store = new GatewayStore(dbPath)
  try {
    const info = store.getSiteInfo()
    const report = store.getCrawlReport()
    if (!info || !report) throw new Error(`Gateway at ${dbPath} is missing site info; rebuild it first.`)
    const origin = new URL(report.startUrl).origin
    const sections = store.listSections()

    const agentsJson = JSON.stringify(
      {
        $schema: 'https://agentsjson.org/schema/v1',
        name: info.name,
        description: info.description,
        url: origin,
        interfaces: options.endpoint
          ? [{ type: 'mcp', transport: 'streamable-http', endpoint: options.endpoint, tools: ['search_site', 'get_page', 'list_sections', 'get_site_info'] }]
          : [],
        contact: info.contact,
        keyPages: info.keyPages,
        contentIndex: { pages: store.pageCount(), lastCrawled: report.crawledAt },
        generator: 'agent-gateway (https://github.com/asish-singh/agent-gateway)',
      },
      null,
      2,
    )

    const lines = [
      `# ${info.name}`,
      '',
      `> ${info.description}`,
      '',
      options.endpoint
        ? `This site has an MCP gateway for AI agents. Connect to ${options.endpoint} (streamable HTTP) for full text search and clean page content. Tools: search_site, get_page, list_sections, get_site_info.`
        : 'This site has a content index built for AI agents.',
      '',
      '## Key pages',
      ...Object.entries(info.keyPages).map(([label, url]) => `- [${label}](${url})`),
      '',
      '## Sections',
      ...sections.map((s) => `- ${s.section} (${s.pageCount} pages)`),
      '',
      `Index of ${store.pageCount()} pages, last crawled ${report.crawledAt}.`,
    ]
    return { agentsJson, llmsTxt: lines.join('\n') + '\n' }
  } finally {
    store.close()
  }
}

/** Write agents.json and llms.txt next to the gateway's index. */
export function writeManifests(gatewayDir: string, options: ManifestOptions = {}): ManifestFiles {
  const files = renderManifests(join(gatewayDir, 'index.sqlite'), options)
  writeFileSync(join(gatewayDir, 'agents.json'), files.agentsJson)
  writeFileSync(join(gatewayDir, 'llms.txt'), files.llmsTxt)
  return files
}

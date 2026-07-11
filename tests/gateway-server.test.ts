import { beforeAll, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { GatewayStore } from '../src/index/store.js'
import { createGatewayServer } from '../src/server/gateway-server.js'
import type { ExtractedPage } from '../src/types.js'

const pages: ExtractedPage[] = [
  {
    url: 'https://example-studio.test/',
    title: 'Example Studio',
    description: 'Lighthouse design studio',
    headings: ['Example Studio'],
    markdown: 'We design lighthouses for coastal towns.',
    links: [],
  },
  {
    url: 'https://example-studio.test/services',
    title: 'Services',
    description: 'What we offer',
    headings: ['Lighthouse design', 'Maintenance'],
    markdown: 'Complete lighthouse architecture. Annual fresnel lens polishing.',
    links: [],
  },
]

let client: Client

function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
  const content = result.content as { type: string; text?: string }[]
  return content.map((c) => c.text ?? '').join('\n')
}

beforeAll(async () => {
  const store = new GatewayStore(':memory:')
  store.replaceAllPages(pages)
  store.setSiteInfo({
    name: 'Example Studio',
    description: 'Lighthouse design studio',
    contact: { emails: ['hello@example-studio.test'], phones: [] },
    keyPages: { services: 'https://example-studio.test/services' },
  })
  store.setCrawlReport({
    startUrl: 'https://example-studio.test/',
    crawledAt: '2026-07-11T00:00:00.000Z',
    pagesCrawled: 2,
    usedSitemap: true,
    skipped: [],
    durationMs: 1000,
  })

  const server = createGatewayServer(store)
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  client = new Client({ name: 'test-client', version: '0.0.0' })
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
})

describe('gateway MCP server over a real client connection', () => {
  it('lists the four tools with site specific descriptions', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(['get_page', 'get_site_info', 'list_sections', 'search_site'])
    const search = tools.find((t) => t.name === 'search_site')
    expect(search?.description).toContain('example-studio.test')
  })

  it('search_site returns matching pages', async () => {
    const result = await client.callTool({ name: 'search_site', arguments: { query: 'fresnel lens' } })
    expect(textOf(result)).toContain('https://example-studio.test/services')
  })

  it('search_site explains a miss instead of returning emptiness', async () => {
    const result = await client.callTool({ name: 'search_site', arguments: { query: 'zeppelin hangars' } })
    expect(textOf(result)).toContain('No pages')
  })

  it('get_page returns full markdown and errors helpfully on unknown urls', async () => {
    const hit = await client.callTool({ name: 'get_page', arguments: { url: 'https://example-studio.test/services' } })
    expect(textOf(hit)).toContain('fresnel lens polishing')

    const miss = await client.callTool({ name: 'get_page', arguments: { url: 'https://example-studio.test/nope' } })
    expect(miss.isError).toBe(true)
    expect(textOf(miss)).toContain('No indexed page')
  })

  it('list_sections and get_site_info expose orientation data', async () => {
    const sections = await client.callTool({ name: 'list_sections', arguments: {} })
    expect(textOf(sections)).toContain('services')

    const info = await client.callTool({ name: 'get_site_info', arguments: {} })
    const parsed = JSON.parse(textOf(info))
    expect(parsed.contact.emails).toContain('hello@example-studio.test')
    expect(parsed.index.pages).toBe(2)
  })
})

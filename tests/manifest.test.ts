import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GatewayStore } from '../src/index/store.js'
import { writeManifests } from '../src/manifest.js'

let dir: string

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'gateway-manifest-'))
  mkdirSync(dir, { recursive: true })
  const store = new GatewayStore(join(dir, 'index.sqlite'))
  store.replaceAllPages([
    {
      url: 'https://example-studio.test/services',
      title: 'Services',
      description: 'What we offer',
      headings: ['Lighthouse design'],
      markdown: 'Complete lighthouse architecture.',
      links: [],
    },
  ])
  store.setSiteInfo({
    name: 'Example Studio',
    description: 'Lighthouse design studio',
    contact: { emails: ['hello@example-studio.test'], phones: [] },
    keyPages: { services: 'https://example-studio.test/services' },
  })
  store.setCrawlReport({
    startUrl: 'https://example-studio.test/',
    crawledAt: '2026-07-11T00:00:00.000Z',
    pagesCrawled: 1,
    usedSitemap: false,
    skipped: [],
    durationMs: 100,
  })
  store.close()
})

afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('manifest generation', () => {
  it('writes agents.json advertising the MCP endpoint and tools', () => {
    writeManifests(dir, { endpoint: 'https://gateway.test/example-studio.test/mcp' })
    const agents = JSON.parse(readFileSync(join(dir, 'agents.json'), 'utf8'))
    expect(agents.name).toBe('Example Studio')
    expect(agents.interfaces[0].endpoint).toBe('https://gateway.test/example-studio.test/mcp')
    expect(agents.interfaces[0].tools).toContain('search_site')
    expect(agents.contentIndex.pages).toBe(1)
  })

  it('writes llms.txt with site summary, key pages, and the endpoint', () => {
    writeManifests(dir, { endpoint: 'https://gateway.test/example-studio.test/mcp' })
    const llms = readFileSync(join(dir, 'llms.txt'), 'utf8')
    expect(llms).toContain('# Example Studio')
    expect(llms).toContain('https://gateway.test/example-studio.test/mcp')
    expect(llms).toContain('[services](https://example-studio.test/services)')
  })

  it('omits the interface list when no endpoint is known yet', () => {
    writeManifests(dir)
    const agents = JSON.parse(readFileSync(join(dir, 'agents.json'), 'utf8'))
    expect(agents.interfaces).toEqual([])
  })
})

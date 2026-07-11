import { describe, expect, it } from 'vitest'
import { GatewayStore } from '../src/index/store.js'
import type { ExtractedPage } from '../src/types.js'

const pages: ExtractedPage[] = [
  {
    url: 'https://example.com/',
    title: 'Example Studio',
    description: 'home',
    headings: ['Example Studio'],
    markdown: 'We design lighthouses for coastal towns.',
    links: [],
  },
  {
    url: 'https://example.com/services',
    title: 'Services',
    description: 'services',
    headings: ['Lighthouse design', 'Maintenance'],
    markdown: 'Complete lighthouse architecture. Annual fresnel lens polishing.',
    links: [],
  },
  {
    url: 'https://example.com/blog/post-1',
    title: 'Why lighthouses matter',
    description: 'post',
    headings: ['Why lighthouses matter'],
    markdown: 'A meditation on beacons and fog.',
    links: [],
  },
]

function makeStore(): GatewayStore {
  const store = new GatewayStore(':memory:')
  store.replaceAllPages(pages)
  return store
}

describe('GatewayStore', () => {
  it('stores pages and reports the count', () => {
    expect(makeStore().pageCount()).toBe(3)
  })

  it('finds pages by full text search with stemming', () => {
    const hits = makeStore().search('lighthouse designs')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.map((h) => h.url)).toContain('https://example.com/services')
  })

  it('survives FTS syntax characters in queries', () => {
    expect(() => makeStore().search('lens" OR (fog*')).not.toThrow()
    expect(makeStore().search('')).toEqual([])
  })

  it('returns full page content by url', () => {
    const page = makeStore().getPage('https://example.com/services')
    expect(page?.markdown).toContain('fresnel')
    expect(makeStore().getPage('https://example.com/nope')).toBeNull()
  })

  it('groups pages into sections by first path segment', () => {
    const sections = makeStore().listSections()
    const names = sections.map((s) => s.section)
    expect(names).toContain('blog')
    expect(names).toContain('(home)')
  })

  it('replaceAllPages fully replaces prior content', () => {
    const store = makeStore()
    store.replaceAllPages([pages[0] as ExtractedPage])
    expect(store.pageCount()).toBe(1)
    expect(store.search('fresnel')).toEqual([])
  })
})

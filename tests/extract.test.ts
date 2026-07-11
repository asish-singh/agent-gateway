import { describe, expect, it } from 'vitest'
import { extractPage } from '../src/crawler/extract.js'
import { FIXTURE_PAGES } from './fixture-site.js'

describe('extractPage', () => {
  it('extracts title, description, headings, and markdown from main content', () => {
    const page = extractPage('https://example.com/services', FIXTURE_PAGES['/services'] as string)
    expect(page.title).toBe('Services')
    expect(page.description).toBe('Services page')
    expect(page.headings).toContain('Lighthouse design')
    expect(page.markdown).toContain('fresnel lens')
  })

  it('strips navigation and footer boilerplate from markdown', () => {
    const page = extractPage('https://example.com/', FIXTURE_PAGES['/'] as string)
    expect(page.markdown).not.toContain('Contact')
    expect(page.markdown).not.toContain('© Example Studio')
    expect(page.markdown).toContain('lighthouses for coastal towns')
  })

  it('collects only same-origin links, resolved and de-fragmented', () => {
    const html = `<html><body><main>
      <a href="/a#section">a</a>
      <a href="https://example.com/b">b</a>
      <a href="https://other.com/c">c</a>
      <a href="mailto:x@y.z">mail</a>
    </main></body></html>`
    const page = extractPage('https://example.com/', html)
    expect(page.links.sort()).toEqual(['https://example.com/a', 'https://example.com/b'])
  })

  it('falls back to h1 then pathname when title is missing', () => {
    expect(extractPage('https://example.com/x', '<html><body><h1>Hello</h1></body></html>').title).toBe('Hello')
    expect(extractPage('https://example.com/x', '<html><body><p>hi</p></body></html>').title).toBe('/x')
  })
})

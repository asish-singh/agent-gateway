import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Server } from 'node:http'
import { buildGateway } from '../src/build.js'
import { GatewayStore } from '../src/index/store.js'
import { startFixtureSite } from './fixture-site.js'
import type { CrawlReport } from '../src/types.js'

let server: Server
let baseUrl: string
let outDir: string

beforeAll(async () => {
  ;({ server, baseUrl } = await startFixtureSite())
  outDir = mkdtempSync(join(tmpdir(), 'gateway-test-'))
})

afterAll(() => {
  server.close()
  rmSync(outDir, { recursive: true, force: true })
})

describe('buildGateway end to end against a local fixture site', () => {
  it('crawls, respects robots.txt, and produces a queryable index plus report', async () => {
    const result = await buildGateway(baseUrl, outDir, { requestIntervalMs: 0 }, () => {})

    expect(existsSync(result.dbPath)).toBe(true)
    const report = JSON.parse(readFileSync(join(result.dir, 'crawl-report.json'), 'utf8')) as CrawlReport
    expect(report.pagesCrawled).toBe(4)
    expect(report.skipped.map((s) => s.reason)).toContain('robots-disallowed')

    const store = new GatewayStore(result.dbPath)
    const hits = store.search('fresnel lens polishing')
    expect(hits[0]?.url).toBe(`${baseUrl}/services`)

    const info = store.getSiteInfo()
    expect(info?.contact.emails).toContain('hello@example-studio.test')
    expect(info?.keyPages['contact']).toBe(`${baseUrl}/contact`)
    store.close()
  }, 30000)
})

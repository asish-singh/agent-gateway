import Database from 'better-sqlite3'
import type { CrawlReport, ExtractedPage, SiteInfo } from '../types.js'

export interface SearchHit {
  url: string
  title: string
  excerpt: string
  rank: number
}

export interface SectionSummary {
  section: string
  pageCount: number
  sampleTitles: string[]
}

/**
 * One SQLite file per site. Pages live in a plain table; an external-content
 * FTS5 table provides full text search over title, headings, and body.
 */
export class GatewayStore {
  private db: Database.Database

  constructor(path: string) {
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY,
        url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        headings TEXT NOT NULL,
        markdown TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
        title, headings, markdown, content='pages', content_rowid='id', tokenize='porter unicode61'
      );
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `)
  }

  replaceAllPages(pages: ExtractedPage[]): void {
    const insert = this.db.prepare(
      'INSERT INTO pages (url, title, description, headings, markdown) VALUES (?, ?, ?, ?, ?)',
    )
    this.db.transaction(() => {
      this.db.exec("DELETE FROM pages; INSERT INTO pages_fts(pages_fts) VALUES('delete-all');")
      for (const p of pages) {
        const { lastInsertRowid } = insert.run(p.url, p.title, p.description, p.headings.join('\n'), p.markdown)
        this.db
          .prepare('INSERT INTO pages_fts(rowid, title, headings, markdown) VALUES (?, ?, ?, ?)')
          .run(lastInsertRowid, p.title, p.headings.join('\n'), p.markdown)
      }
    })()
  }

  setMeta(key: string, value: unknown): void {
    this.db
      .prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, JSON.stringify(value))
  }

  getMeta<T>(key: string): T | null {
    const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined
    return row ? (JSON.parse(row.value) as T) : null
  }

  setSiteInfo(info: SiteInfo): void {
    this.setMeta('siteInfo', info)
  }
  getSiteInfo(): SiteInfo | null {
    return this.getMeta<SiteInfo>('siteInfo')
  }
  setCrawlReport(report: CrawlReport): void {
    this.setMeta('crawlReport', report)
  }
  getCrawlReport(): CrawlReport | null {
    return this.getMeta<CrawlReport>('crawlReport')
  }

  pageCount(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM pages').get() as { n: number }).n
  }

  /** Full text search. The query is turned into quoted OR terms so raw user input never breaks FTS syntax. */
  search(query: string, limit = 8): SearchHit[] {
    const terms = query
      .split(/\s+/)
      .map((t) => t.replace(/"/g, '').trim())
      .filter(Boolean)
      .map((t) => `"${t}"`)
    if (terms.length === 0) return []
    const ftsQuery = terms.join(' OR ')
    const rows = this.db
      .prepare(
        `SELECT p.url, p.title,
                snippet(pages_fts, 2, '', '', ' … ', 40) AS excerpt,
                bm25(pages_fts, 5.0, 3.0, 1.0) AS rank
         FROM pages_fts JOIN pages p ON p.id = pages_fts.rowid
         WHERE pages_fts MATCH ? ORDER BY rank LIMIT ?`,
      )
      .all(ftsQuery, limit) as SearchHit[]
    return rows
  }

  getPage(url: string): ExtractedPage | null {
    const row = this.db
      .prepare('SELECT url, title, description, headings, markdown FROM pages WHERE url = ?')
      .get(url) as { url: string; title: string; description: string; headings: string; markdown: string } | undefined
    if (!row) return null
    return { ...row, headings: row.headings ? row.headings.split('\n') : [], links: [] }
  }

  /** Group pages by their first path segment to give agents a site orientation. */
  listSections(): SectionSummary[] {
    const rows = this.db.prepare('SELECT url, title FROM pages').all() as { url: string; title: string }[]
    const groups = new Map<string, string[]>()
    for (const { url, title } of rows) {
      const segment = new URL(url).pathname.split('/').filter(Boolean)[0] ?? '(home)'
      const list = groups.get(segment) ?? []
      list.push(title)
      groups.set(segment, list)
    }
    return [...groups.entries()]
      .map(([section, titles]) => ({ section, pageCount: titles.length, sampleTitles: titles.slice(0, 5) }))
      .sort((a, b) => b.pageCount - a.pageCount)
  }

  close(): void {
    this.db.close()
  }
}

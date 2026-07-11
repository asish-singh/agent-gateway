# Change log

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses semantic versioning.

## [Unreleased]

### Added

- `agent-gateway serve <hostname>` serves a built gateway as an MCP server over stdio, exposing search_site, get_page, list_sections, and get_site_info with descriptions naming the actual site (milestone 2, issue #2). Tested through a real MCP client connection.
- `agent-gateway build <url>` crawls a website (sitemap first, link following as fallback), respects robots.txt with a polite default rate of one request per second, extracts main content to markdown, and stores everything in one SQLite file per site with an FTS5 full text index (milestone 1, issue #1).
- `agent-gateway refresh <url>` rebuilds a site's index from scratch.
- Machine written `crawl-report.json` per gateway listing every skipped URL with a reason, no silent truncation.
- Site basics extraction (name, description, contact details, key pages) stored for the future `get_site_info` tool.
- Test suite with a local fixture website so tests never touch the network, plus lint, typecheck, and CI on every push and pull request.
- Architecture decision records in `docs/adr/`.

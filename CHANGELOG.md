# Change log

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses semantic versioning.

## [0.2.0] - 2026-07-12

### Changed

- Renamed the package to `mcp-site-gateway` and published it to npm, so the whole tool now runs with `npx mcp-site-gateway <command>` and no clone or build step. The GitHub repository moved to the same name (old links redirect).
- The crawler user agent and the generator field in agents.json now carry the new name.

### Added

- MIT license file.
- README rewritten for non technical site owners, prerequisites with version checks, expected output after every step, and a troubleshooting section.

## [0.1.0] - 2026-07-11

### Added

- `agent-gateway manifest <hostname> --endpoint <url>` generates the agents.json and llms.txt discovery files a site owner hosts at their own domain to advertise the gateway to visiting agents (milestone 4, issue #4).
- `agent-gateway serve --http <port>` serves every built gateway over streamable HTTP from one process, routed by path (`/<hostname>/mcp`), with optional bearer token auth, a `/healthz` endpoint, and stateless request handling (milestone 3, issue #3). Deployment guide in docs/deploy.md.
- `agent-gateway serve <hostname>` serves a built gateway as an MCP server over stdio, exposing search_site, get_page, list_sections, and get_site_info with descriptions naming the actual site (milestone 2, issue #2). Tested through a real MCP client connection.
- `agent-gateway build <url>` crawls a website (sitemap first, link following as fallback), respects robots.txt with a polite default rate of one request per second, extracts main content to markdown, and stores everything in one SQLite file per site with an FTS5 full text index (milestone 1, issue #1).
- `agent-gateway refresh <url>` rebuilds a site's index from scratch.
- Machine written `crawl-report.json` per gateway listing every skipped URL with a reason, no silent truncation.
- Site basics extraction (name, description, contact details, key pages) stored for the future `get_site_info` tool.
- Test suite with a local fixture website so tests never touch the network, plus lint, typecheck, and CI on every push and pull request.
- Architecture decision records in `docs/adr/`.

### Changed

- Switched from better-sqlite3 to the SQLite driver built into Node (node:sqlite), removing all native dependencies so gateways install on restricted shared hosting. Requires Node 22.13 or newer. See ADR 0005.
- The HTTP server now tolerates trailing slashes on MCP paths, lists the available endpoints in 404 responses, and answers the root path with a plain explanation and the endpoint list.

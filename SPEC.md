# Agent Gateway, version one specification

Date, 2026-07-11. Status, agreed direction, build not started.

## What it is

A command line tool plus a small hosted runtime. You point the tool at a website. It crawls the site, builds a searchable index of the content, and generates a working MCP server for that site. The server can run locally over stdio for testing, or be deployed as a remote HTTP server that any MCP capable assistant (Claude, ChatGPT, and others) can connect to.

In plain terms, the auditor tells a business "AI agents cannot use your site." Agent Gateway is the answer, "here is the plug that makes them able to."

## Who it is for

- Version one user, Asish himself, running it for AI SEO consulting clients from the private aiseo-clients workflow.
- The generated servers are for the clients' end users, meaning anyone whose AI assistant wants to use the client's site.

## What version one does

One command builds a gateway from a site.

```
agent-gateway build https://example.com
```

That produces a folder `gateways/example.com/` containing

1. A content index of the site (pages, titles, headings, clean text).
2. A ready to run MCP server exposing four tools.
3. A generated manifest file the client can host at their own domain (an `agents.json` and `llms.txt` pair) that advertises the gateway to visiting agents.
4. A short machine written report saying what was crawled, what was skipped, and how fresh the index is.

A second command serves it.

```
agent-gateway serve example.com            # local stdio, for testing in Claude Code
agent-gateway serve example.com --http 8080  # remote HTTP transport, for deployment
```

### The four tools every gateway exposes

1. `search_site` takes a plain language query, returns the best matching pages with title, URL, and a relevant excerpt.
2. `get_page` takes a URL from this site, returns the full page content as clean markdown.
3. `list_sections` returns the site's structure, top level sections and what each contains, so an agent can orient itself.
4. `get_site_info` returns the business basics gathered at crawl time, name, description, contact details, opening hours if found, and links to key pages (pricing, booking, contact).

Tool descriptions are generated per site, mentioning the site's actual name and subject matter, because assistants pick tools by their descriptions.

## How it works inside

### Crawler

- Starts from the given URL, reads `sitemap.xml` if present, otherwise follows internal links.
- Respects `robots.txt` and a polite rate limit (default one request per second, configurable).
- Caps at 500 pages in version one, logging anything skipped, no silent truncation.
- Strips navigation, cookie banners, and boilerplate, keeps main content, converts to markdown.
- Stores everything in a single SQLite file per site, using SQLite full text search (FTS5) as the index. No external database, no embeddings in version one. Full text search is good enough for the tool loop because the agent reformulates queries itself.

### Server generation

- The server is not code generated per site. There is one generic server implementation in this repo, and `build` produces a config plus the SQLite index that the generic server loads. This keeps every deployed gateway upgradeable by redeploying one codebase.
- Built in TypeScript on the official `@modelcontextprotocol/sdk`, supporting stdio and streamable HTTP transports.

### Refresh

- `agent-gateway refresh example.com` re crawls and rebuilds the index. Version one runs this manually or via a plain cron job on the VPS. No incremental crawling yet.

### Hosting

- Deployment target is Asish's existing Hostinger VPS. One Node process can serve multiple gateways, routed by path, for example `gateway.asishsingh.in/example-com/mcp`.
- Each gateway gets an access token in version one (a simple bearer token the client shares or leaves open, their choice). Full OAuth is out of scope.

## What version one deliberately does not do

- No write actions (no form filling, no bookings, no purchases). Read and search only. Actions are the version two headline.
- No embeddings or vector search.
- No JavaScript rendering. Sites that only render content in the browser get flagged in the crawl report as "needs rendering support," a version two feature.
- No self serve signup or billing. It is an internal consulting tool first.
- No per site custom tools. Version two can read a site's OpenAPI spec or product feed and add tools like `search_products`.

## How we know it works

Definition of done for version one, all four checks pass.

1. Build a gateway for asishsingh.in and one for the Agentic Web Index site.
2. Connect Claude Code to the local stdio server and successfully answer "what services does Asish offer and how do I contact him" using only the gateway tools.
3. Deploy one gateway to the Hostinger VPS and connect to it remotely from claude.ai.
4. Run agent-readiness-auditor against a site before and after adding the generated manifest, and the score improves.

## Milestones

1. **Crawl and index.** Crawler, content extraction, SQLite FTS index, crawl report.
2. **Serve locally.** Generic MCP server over stdio with the four tools, tested from Claude Code.
3. **Serve remotely.** HTTP transport, multi gateway routing, bearer token, VPS deployment.
4. **Manifest and proof.** Generate agents.json and llms.txt, run the before and after audit, write the demo walkthrough into the README.

## Stack decisions (chosen defaults, say if any should change)

- TypeScript and Node with npm, matching the auditor and Asish's default.
- `@modelcontextprotocol/sdk` for the server, the industry standard.
- SQLite via `better-sqlite3` with FTS5 for the index.
- `cheerio` for HTML parsing and a readability extraction library for main content.

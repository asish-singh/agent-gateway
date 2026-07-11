# agent-gateway

Turn any existing website into a working MCP server so AI assistants can search and use it, not just read it.

Most websites were built for human eyes. AI assistants can read them at best, but they cannot search them properly or act on them. Agent Gateway points at a site, learns its content, and produces a hosted MCP server, the standard plug that lets assistants like Claude and ChatGPT work with the site directly.

This is the fixing half of a funnel that starts with the [agent-readiness-auditor](https://github.com/asish-singh/agent-readiness-auditor) (which grades sites) and the [Agentic Web Index](https://github.com/asish-singh/agentic-web-index) (which ranks 200 of them).

## How to use

The crawler, the index, and the local MCP server work today. Remote hosting is next.

```bash
npm install
npm run build
node dist/cli.js build https://example.com
```

That produces `gateways/example.com/` containing `index.sqlite` (the searchable content index) and `crawl-report.json` (what was crawled, what was skipped, and why). Run `node dist/cli.js refresh https://example.com` to rebuild it later.

Then serve it as an MCP server:

```bash
node dist/cli.js serve example.com
```

To use it from Claude Code, register it once and start asking questions about the site:

```bash
claude mcp add example-gateway -- node /path/to/agent-gateway/dist/cli.js serve example.com
```

The server exposes four tools, search_site, get_page, list_sections, and get_site_info.

For remote use, one process can serve every built gateway over HTTP, with optional bearer token protection.

```bash
node dist/cli.js serve --http 8080 --token <secret>
```

Endpoints live at `/<hostname>/mcp`, and `/healthz` lists what is being served. See [docs/deploy.md](docs/deploy.md) for putting this on a VPS behind HTTPS.

The full version one specification lives in [SPEC.md](SPEC.md). Design decisions are recorded in [docs/adr/](docs/adr/) and changes in [CHANGELOG.md](CHANGELOG.md).

## Development

`npm test` runs the test suite against a local fixture website, so tests never touch the network. `npm run lint` and `npm run typecheck` keep the code honest, and CI runs all three on every push and pull request.

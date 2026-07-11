# agent-gateway

Turn any existing website into a working MCP server so AI assistants can search and use it, not just read it.

Most websites were built for human eyes. AI assistants can read them at best, but they cannot search them properly or act on them. Agent Gateway points at a site, learns its content, and produces a hosted MCP server, the standard plug that lets assistants like Claude and ChatGPT work with the site directly.

This is the fixing half of a funnel that starts with the [agent-readiness-auditor](https://github.com/asish-singh/agent-readiness-auditor) (which grades sites) and the [Agentic Web Index](https://github.com/asish-singh/agentic-web-index) (which ranks 200 of them).

## How to use

The crawler and index (milestone 1) work today. The MCP server itself is next.

```bash
npm install
npm run build
node dist/cli.js build https://example.com
```

That produces `gateways/example.com/` containing `index.sqlite` (the searchable content index) and `crawl-report.json` (what was crawled, what was skipped, and why). Run `node dist/cli.js refresh https://example.com` to rebuild it later.

The full version one specification lives in [SPEC.md](SPEC.md). Design decisions are recorded in [docs/adr/](docs/adr/) and changes in [CHANGELOG.md](CHANGELOG.md).

## Development

`npm test` runs the test suite against a local fixture website, so tests never touch the network. `npm run lint` and `npm run typecheck` keep the code honest, and CI runs all three on every push and pull request.

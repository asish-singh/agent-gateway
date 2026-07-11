# agent-gateway

Turn any existing website into a working MCP server so AI assistants can search and use it, not just read it.

Most websites were built for human eyes. AI assistants can read them at best, but they cannot search them properly or extract facts reliably. Agent Gateway points at a site, learns its content, and serves it as an MCP server, the standard plug that lets assistants like Claude and ChatGPT work with the site directly.

It is the fixing half of a funnel that starts with the [agent-readiness-auditor](https://github.com/asish-singh/agent-readiness-auditor) (which grades sites) and the [Agentic Web Index](https://asishsingh.in/agentic-web-index/) (which ranks 200 of them).

## Try a live gateway first

A gateway built with this tool runs in production around [asishsingh.in](https://asishsingh.in). Connect to it in one minute and see what your own site could offer.

In Claude Code:

```bash
claude mcp add asish --transport http https://gateway.asishsingh.in/asishsingh.in/mcp
```

On Claude.ai, open Settings, then Connectors, then Add custom connector, and paste the same address. Cursor and Windsurf accept it as a remote MCP server URL in their settings. Then ask the assistant anything about the site and watch it query instead of scrape.

## Build a gateway for your own site

You need [Node.js](https://nodejs.org) 20 or newer. Then:

```bash
# 1. Get the tool (once)
git clone https://github.com/asish-singh/agent-gateway
cd agent-gateway
npm install
npm run build

# 2. Build a gateway for your site
node dist/cli.js build https://example.com
```

The build crawls your site politely and produces `gateways/example.com/` containing `index.sqlite` (the searchable content index) and `crawl-report.json` (what was crawled, what was skipped, and why). When your site changes, rebuild with `node dist/cli.js refresh https://example.com`.

```bash
# 3. Serve it and test locally
node dist/cli.js serve example.com
```

To test from Claude Code, register the local server once and start asking questions about the site:

```bash
claude mcp add example-gateway -- node /path/to/agent-gateway/dist/cli.js serve example.com
```

Every gateway exposes four tools to the connected assistant, `search_site` (full text search), `get_page` (clean content of one page), `list_sections` (site structure), and `get_site_info` (business basics).

## Put it on the internet

Local serving stops when your computer sleeps. For an always on gateway, run it on any small server. One process serves every gateway you have built:

```bash
node dist/cli.js serve --http 8080 --token <secret>
```

Endpoints live at `/<hostname>/mcp`, `/healthz` lists what is being served, and the token flag is optional bearer protection for private gateways. [docs/deploy.md](docs/deploy.md) walks through a VPS setup behind HTTPS step by step.

## Help agents find it

Visiting agents look for discovery files at your domain. Generate them with:

```bash
node dist/cli.js manifest example.com --endpoint https://gateway.example.com/example.com/mcp
```

Upload the result to your website, `llms.txt` at the site root and `agents.json` under `/.well-known/`. They are the sign on the door telling AI agents a proper entrance exists and where it is.

## Project documents

The version one specification is in [SPEC.md](SPEC.md), design decisions are recorded in [docs/adr/](docs/adr/), and changes in [CHANGELOG.md](CHANGELOG.md).

## Development

`npm test` runs the test suite against a local fixture website, so tests never touch the network. `npm run lint` and `npm run typecheck` keep the code honest, and CI runs all three on every push and pull request.

# mcp-site-gateway

Turn any existing website into a working MCP server so AI assistants can search and use it, not just read it.

Most websites were built for human eyes. AI assistants can read them at best, but they cannot search them properly or extract facts reliably. This tool points at a site, learns its content, and serves it as an MCP server, the standard plug that lets assistants like Claude and ChatGPT work with the site directly.

It is the fixing half of a funnel that starts with the [agent-readiness-auditor](https://github.com/asish-singh/agent-readiness-auditor) (which grades sites) and the [Agentic Web Index](https://asishsingh.in/agentic-web-index/) (which ranks 200 of them).

## Try a live gateway first (one minute, nothing to install)

Two gateways built with this tool run in production, serving [asishsingh.in](https://asishsingh.in) and [freeyoutubetranscribe.com](https://freeyoutubetranscribe.com) from one process. Connect to one and see what your own site could offer.

In Claude Code:

```bash
claude mcp add asish --transport http https://gateway.asishsingh.in/asishsingh.in/mcp
```

On Claude.ai, open Settings, then Connectors, then Add custom connector, and paste the same address. Cursor and Windsurf accept it as a remote MCP server URL in their settings.

Then ask the assistant something like "what does this site say about the Agentic Web Index?" and watch it call `search_site` and `get_page` instead of scraping.

## Build a gateway for your own site

### What you need

- A computer with a terminal (Terminal on Mac, PowerShell on Windows).
- [Node.js](https://nodejs.org) 22.13 or newer. Check with `node --version`. If that prints an error or a lower number, install the LTS version from nodejs.org first.

That's all. No download, no build, no programming knowledge, every step below is copy and paste, and each one says what you should see.

### Step 1, build a gateway for your site

Replace `example.com` with your website in every command from here on.

```bash
npx mcp-site-gateway build https://example.com
```

The first run asks npx to install the package, answer yes. The build then crawls your site politely (it respects your robots.txt) and can take a few minutes for a large site. It worked if it ends by printing a small summary like:

```
{ "dir": "gateways/example.com", "pages": 42, "skipped": 3 }
```

Your site's searchable index now lives in a `gateways/example.com/` folder in the directory where you ran the command, alongside `crawl-report.json`, which lists every page visited or skipped and why.

### Step 2, connect it to Claude and test

Run this from the same directory:

```bash
claude mcp add example-gateway -- npx -y mcp-site-gateway serve example.com --out "$PWD/gateways"
```

Now ask Claude Code a question about your site, for example "using example-gateway, what does my site say about pricing?" You should see it call tools named `search_site` or `get_page` and answer from your actual pages. That's the whole product working.

Every gateway exposes four tools, `search_site` (full text search), `get_page` (clean content of one page), `list_sections` (site structure), and `get_site_info` (business basics).

### Step 3, keep it fresh

When your website changes, update the index from the same directory with:

```bash
npx mcp-site-gateway refresh https://example.com
```

## Put it on the internet

Everything so far runs only while your computer is awake. For a gateway that AI assistants can reach at any time, run the same tool on a small server:

```bash
npx mcp-site-gateway serve --http 8080 --token <secret>
```

One process serves every gateway in the `gateways/` folder it is started from. You should see a line like:

```
mcp-site-gateway serving 2 gateway(s) on http://127.0.0.1:8080, endpoints /example.com/mcp /other.com/mcp
```

Each site's endpoint is `/<hostname>/mcp`, `/healthz` lists what is being served (useful as an uptime check), and the token flag is optional bearer protection for private gateways. [docs/deploy.md](docs/deploy.md) walks through two real hosting setups step by step, a VPS behind HTTPS and Hostinger shared hosting, the latter is how the live gateways above are deployed.

## Help agents find it

A gateway nobody can discover does nothing. Generate the two discovery files:

```bash
npx mcp-site-gateway manifest example.com --endpoint https://gateway.example.com/example.com/mcp
```

This writes `llms.txt` and `agents.json` into your `gateways/example.com/` folder. Upload them to your website, `llms.txt` at the site root (so it is reachable at `example.com/llms.txt`) and `agents.json` in a folder called `.well-known` (reachable at `example.com/.well-known/agents.json`). They are the sign on the door telling AI agents a proper entrance exists and where it is. Both live sites above publish both files if you want to see real examples.

## If something goes wrong

- **`node: command not found`** Node.js is not installed or the terminal was opened before installing. Install from nodejs.org, then open a new terminal window.
- **The build finds 0 pages.** Your site may block automated visitors (common with aggressive bot protection). Check `gateways/<your-site>/crawl-report.json` for the reason, and run `npx agent-readiness-auditor <your-site>` to see your site's stance.
- **Claude does not list the gateway.** Run `claude mcp list` to confirm it registered. The registration stores the gateways folder's full path, so if you move that folder, remove and re add the server.
- **Anything else.** Open an issue with your `crawl-report.json` attached, real reports are how the crawler improves.

## Working from source

```bash
git clone https://github.com/asish-singh/mcp-site-gateway
cd mcp-site-gateway
npm install && npm run build
node dist/cli.js --help
```

`npm test` runs the test suite against a local fixture website, so tests never touch the network. `npm run lint` and `npm run typecheck` keep the code honest, and CI runs all three on every push and pull request.

## Project documents

The version one specification is in [SPEC.md](SPEC.md), design decisions are recorded in [docs/adr/](docs/adr/), and changes in [CHANGELOG.md](CHANGELOG.md). MIT licensed.

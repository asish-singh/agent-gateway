# Deploying gateways to a VPS

This is the version one deployment shape, one Node process serving every built gateway over HTTP, behind a reverse proxy that terminates TLS.

## Steps

1. Copy the repo (or a release tarball) and the `gateways/` folder to the server, then `npm ci && npm run build`.
2. Pick a token and start the server bound to localhost.

```bash
AGENT_GATEWAY_TOKEN=<long-random-string> node dist/cli.js serve --http 8080
```

3. Point a reverse proxy (nginx, Caddy, or the host's panel) at `127.0.0.1:8080` under a dedicated domain, for example `gateway.example.com`, with HTTPS on.
4. Each site's MCP endpoint is then `https://gateway.example.com/<hostname>/mcp`, and clients send `Authorization: Bearer <token>`.
5. Keep the process alive with a process manager (pm2 or a systemd unit) and refresh indexes on a cron schedule with `node dist/cli.js refresh <url>`.

## Connecting a client

From Claude Code

```bash
claude mcp add example-remote --transport http https://gateway.example.com/example.com/mcp --header "Authorization: Bearer <token>"
```

From claude.ai, add a custom connector with the same URL and header.

`GET /healthz` lists the gateways a running server is holding, useful as an uptime probe.

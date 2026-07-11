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

## Hostinger shared hosting notes (how the first real deployment was done)

No VPS is needed. Hostinger Premium hosting runs Node apps directly.

1. Create a subdomain for the gateway (for example gateway.asishsingh.in).
2. Bundle the app for upload, src, tsconfig.json, package.json, package-lock.json, the built gateways folder, and a server.mjs entry file that reads process.env.PORT and binds 0.0.0.0.
3. Pin the Node version by setting engines.node to 24 in the bundle package.json, the platform reads it during auto detection.
4. Upload with the Hostinger deploy tooling, the platform runs npm install and npm run build, then starts the entry file. HTTPS is automatic.

The live proof runs at https://gateway.asishsingh.in/asishsingh.in/mcp with /healthz as the probe. This works because the store uses node:sqlite (ADR 0005), nothing needs compiling at install time.

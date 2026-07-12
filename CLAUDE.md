# Project: mcp-site-gateway

Turn any existing website into a working MCP server so AI assistants can search and use it, not just read it.

## Status

- Started: 2026-07-11
- Current state: version 0.2.0 published to npm as mcp-site-gateway (repo renamed to match, old agent-gateway links redirect). Two live gateways run in production at gateway.asishsingh.in, serving asishsingh.in and freeyoutubetranscribe.com (open access, no token yet). All spec milestones done.

## Goal

A product Asish can sell through his AI SEO practice. Point it at a client's website, get back a hosted MCP server that AI assistants (Claude, ChatGPT, and others) can connect to. It completes his funnel, the auditor finds the problem, the Agentic Web Index publishes it, and Agent Gateway fixes it. See SPEC.md for the full version one specification.

## How to run it

See the README, npm install, npm run build, then npx mcp-site-gateway build <url> and npx mcp-site-gateway serve <hostname>. npm test runs the suite.

## Notes for Claude

- Asish is non-technical: explain in plain language, choose sensible defaults, confirm before anything destructive.
- Never use em dashes, en dashes, hyphens, or colons as punctuation in prose. Technical strings (filenames, URLs, flags, code) are exempt.
- Commit working checkpoints as you go.
- Keep this file updated as the project evolves (goal, status, how to run).

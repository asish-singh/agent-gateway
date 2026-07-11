# Project: agent-gateway

Turn any existing website into a working MCP server so AI assistants can search and use it, not just read it.

## Status

- Started: 2026-07-11
- Current state: version 0.1.0 released and deployed. The first live gateway serves asishsingh.in at https://gateway.asishsingh.in/asishsingh.in/mcp (open access, no token yet). All spec milestones done.

## Goal

A product Asish can sell through his AI SEO practice. Point it at a client's website, get back a hosted MCP server that AI assistants (Claude, ChatGPT, and others) can connect to. It completes his funnel, the auditor finds the problem, the Agentic Web Index publishes it, and Agent Gateway fixes it. See SPEC.md for the full version one specification.

## How to run it

See the README, npm install, npm run build, then node dist/cli.js build <url> and node dist/cli.js serve <hostname>. npm test runs the suite.

## Notes for Claude

- Asish is non-technical: explain in plain language, choose sensible defaults, confirm before anything destructive.
- Never use em dashes, en dashes, hyphens, or colons as punctuation in prose. Technical strings (filenames, URLs, flags, code) are exempt.
- Commit working checkpoints as you go.
- Keep this file updated as the project evolves (goal, status, how to run).

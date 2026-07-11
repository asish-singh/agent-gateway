# ADR 0004, stateless HTTP serving with a fresh server per request

Date 2026-07-11. Status accepted.

## Context

Remote MCP over streamable HTTP can run stateful (sessions with ids, resumable streams) or stateless (every request self contained). Stateful mode needs session bookkeeping and makes restarts and multi process serving harder.

## Decision

The HTTP transport runs stateless. Every request gets a fresh transport and server instance over a shared read only store, torn down when the response closes. One process serves many gateways, routed by path (`/<hostname>/mcp`), with an optional single bearer token and a `/healthz` endpoint. The server binds 127.0.0.1 by default and is meant to sit behind a reverse proxy that terminates TLS.

## Consequences

No sticky sessions, so the process can be restarted or scaled at any time, which suits a small VPS. Creating a server object per request is cheap because the store (the SQLite handle) is shared and read only. Per gateway tokens and OAuth are deferred, one token per process is enough while every deployment serves one consulting client.

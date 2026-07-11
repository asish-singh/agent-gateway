# ADR 0002, one generic server that loads per site data, not generated code per site

Date 2026-07-11. Status accepted.

## Context

"Generate an MCP server for a site" could mean emitting a bespoke codebase per client. Twenty clients would then mean twenty codebases to patch every time the MCP SDK changes or a bug is found.

## Decision

There is exactly one server implementation, living in this repo. `agent-gateway build` produces only data, a SQLite index plus site metadata. The server loads that data at startup. Per site behavior (tool descriptions naming the actual business, site info) comes from the data, not from code.

## Consequences

Every deployed gateway is upgraded by redeploying one codebase. Clients cannot get custom tools in version one, which is fine, custom tools (for example from an OpenAPI spec) are a version two feature and will be designed as data driven plugins for the same generic server.

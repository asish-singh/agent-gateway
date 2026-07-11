# ADR 0005, use the SQLite that ships inside Node instead of better-sqlite3

Date 2026-07-11. Status accepted. Supersedes the driver choice in ADR 0001 (the FTS5 design is unchanged).

## Context

The first deployment attempt failed on Hostinger shared hosting because better-sqlite3 is a native module that must compile at install time, and the build machine there has no Python or compiler toolchain. Cheap shared hosting is exactly where client gateways will often run.

## Decision

Use `node:sqlite`, the SQLite driver built into Node itself (stable since Node 22.13), which includes FTS5. Drop better-sqlite3 entirely and declare `engines.node >= 22.13`.

## Consequences

Zero native dependencies, so `npm install` works on any host that has Node, including restricted shared hosting. The API differences were minor (explicit BEGIN and COMMIT instead of a transaction helper). The trade off is requiring a recent Node version, which every deployment target we care about already offers.

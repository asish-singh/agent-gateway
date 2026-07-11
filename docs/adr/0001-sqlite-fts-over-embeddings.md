# ADR 0001, use SQLite full text search instead of embeddings for version one

Date 2026-07-11. Status accepted.

## Context

The gateway needs to answer plain language searches over a site's content. The fashionable choice is vector embeddings with semantic search. That would add an external model dependency, an API cost per crawl, and infrastructure to store vectors.

## Decision

Version one uses SQLite FTS5 with the porter stemming tokenizer, weighted so title matches beat heading matches beat body matches (bm25 weights 5, 3, 1). One `index.sqlite` file per site, no external services.

## Consequences

Searches match words rather than meaning. This is acceptable because the caller is an AI agent inside a tool loop, and agents reformulate queries when a first search misses. In exchange we get zero runtime dependencies, trivially portable gateways (one file), and free hosting. If real usage shows agents failing to find content they describe differently than the site words it, add an embeddings layer then, behind the same `search_site` tool so nothing downstream changes.

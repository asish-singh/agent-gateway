# ADR 0003, the crawler is polite by default and never truncates silently

Date 2026-07-11. Status accepted.

## Context

This tool will be pointed at client websites and, during sales, at prospect websites we do not control. A rude crawler (parallel hammering, ignoring robots.txt) would damage exactly the reputation the product exists to build. Separately, a crawl that quietly drops pages produces an index that looks complete but is not, and the resulting wrong answers would be blamed on the whole approach.

## Decision

- robots.txt is always honored, no override flag exists.
- Requests are sequential with a default one second gap, configurable but never parallel in version one.
- A page cap (default 500) bounds every crawl, and every URL not crawled is recorded in `crawl-report.json` with a machine readable reason (robots-disallowed, over-page-cap, fetch-error, http-error, not-html, duplicate-content).
- Pages whose extracted content is byte identical to an already crawled page are recorded as duplicate-content rather than indexed twice.
- The crawler identifies itself honestly with an agent-gateway user agent string linking to this repo.

## Consequences

Crawls are slow (a 500 page site takes about nine minutes at default settings). That is acceptable for a consulting workflow where builds run in the background. The crawl report doubles as client evidence of what was and was not covered.

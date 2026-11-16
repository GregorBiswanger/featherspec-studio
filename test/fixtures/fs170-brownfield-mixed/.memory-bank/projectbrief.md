# Project Brief

## Mission

`legacy-shop` — a small order and billing backend that grew over four years. TypeScript, no
framework, one process, one database. It accepts orders, records them as an append-only event
stream with a projection row, and issues and captures invoices against them.

## Primary users

- **An upstream storefront**, which calls this API to place orders.
- **Internal finance staff**, who read the invoices it produces.

## Success criteria

- Order intake stays available and fast even when billing is slow — a slow invoice run must
  never hold up order intake.
- The `orders` ↔ `billing` boundary stays intact: no direct imports in either direction,
  communication by domain events only.
- Changes to a four-year-old codebase land without regressions, proven by a test in the same
  change set.

## Working context

This is a **fixture repository**: the HTTP server and database layers are deliberate stubs, so
the process performs no observable work end to end. The domain logic is real; the seams around
it are not. See `techContext.md` → *Constraints* before planning anything that assumes a live
HTTP surface or a real database.

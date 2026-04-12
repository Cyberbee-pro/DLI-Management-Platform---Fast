---
name: "Issue 19: DB Namespace Mismatch"
about: Track the MongoDB namespace fallback bug in the backend connection config.
title: "Issue 19: DB_NAMESPACE_MISMATCH"
labels: "bug,backend,database"
assignees: ""
---

## Summary
MongoDB can fall back to the default `test` namespace when the connection URI does not include an explicit database path.

## Problem
- Backend database identity is ambiguous when the URI omits the database name.
- Mongoose connection logs do not always make the active namespace obvious during startup.

## Required Fix
- Ensure `MONGODB_URI` includes the explicit database path.
- Keep `DATABASE_NAME=dli_platform_neo` aligned with the URI.
- Log the resolved database name after a successful connection.

## Acceptance Criteria
- `MONGODB_URI` resolves to `dli_platform_neo`.
- Backend startup logs include the active database name.
- No backend connection lands in the `test` namespace.

## Notes
- Touch points: `dli-backend/.env`, `dli-backend/src/config/db.js`, `dli-backend/src/server.js`

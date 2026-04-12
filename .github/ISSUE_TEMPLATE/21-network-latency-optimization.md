---
name: "Issue 21: Network Latency Optimization"
about: Track the SWR caching and navigation warm-up work for the main app shell.
title: "Issue 21: NETWORK_LATENCY_OPTIMIZATION"
labels: "enhancement,frontend,performance"
assignees: ""
---

## Summary
Main navigation still feels like it loads on click when data is fetched imperatively per page.

## Problem
- Tasks, catalogue, and user shell data are not fully benefiting from shared client cache.
- Route transitions should show cached content immediately and revalidate in the background.

## Required Fix
- Use `next/link` navigation with prefetch enabled.
- Cache route data with SWR using stable keys.
- Warm important datasets from the persistent main layout.
- Keep sidebar and top header inside the persistent app layout wrapper.

## Acceptance Criteria
- Revisiting Tasks or Catalogue uses cached data instantly.
- Background revalidation updates stale data without blocking the route transition.
- Sidebar and header stay mounted across main-app navigation.

## Notes
- Touch points: `dli-frontend/app/(main)/layout.tsx`, navigation components, SWR-backed page loaders

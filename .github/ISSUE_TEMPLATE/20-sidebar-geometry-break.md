---
name: "Issue 20: Sidebar Geometry Break"
about: Track the avatar overflow bug in the persistent sidebar shell.
title: "Issue 20: SIDEBAR_GEOMETRY_BREAK"
labels: "bug,frontend,ui"
assignees: ""
---

## Summary
Avatar media can overflow its assigned node and distort the sidebar layout.

## Problem
- The avatar image needs to stay clipped inside a fixed circular frame.
- The sidebar shell needs a strict width and scroll behavior so media cannot expand it.

## Required Fix
- Avatar wrapper must remain `relative overflow-hidden rounded-full`.
- Avatar media must fill the node with `w-full h-full object-cover`.
- Sidebar shell must keep a strict `w-64` footprint with vertical scrolling.

## Acceptance Criteria
- Large avatar payloads do not push or stretch the sidebar.
- Sidebar width remains fixed on desktop and mobile.
- Overflow is clipped cleanly inside the circular avatar frame.

## Notes
- Touch point: `dli-frontend/src/components/shell/sidebar.tsx`

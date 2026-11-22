# Agent board

Coordination file for agents working in parallel. See "Working with other agents" in `AGENTS.md`.
Keep rows short. Remove a row when its branch is merged.

## Claims

| Agent | Branch | Area / files claimed | Status | Updated |
|-------|--------|----------------------|--------|---------|
|       |        |                      |        |         |

Status values: `in progress`, `blocked`, `ready for review`.

## Handoffs

Newest first. Each entry: who, what changed, what is unverified, what the next agent should do.

<!-- example:
### 2026-11-22 claude -> hermes
- Changed: added `src/lib/foodSearch.js` + tests (branch claude/food-search).
- Unverified: USDA rate limits under load.
- Next: wire it into AddFoodSheet.jsx.
-->

# Agent board

Coordination file for agents working in parallel. See "Working with other agents" in `AGENTS.md`.
Keep rows short. Remove a row when its branch is merged.

## Claims

| Agent | Branch | Area / files claimed | Status | Updated |
|-------|--------|----------------------|--------|---------|
| claude | claude/design-pass | Whole UI: `src/index.css`, `src/pages/*`, most of `src/components/*`, new `src/lib/{outcomes,supportCopy,signOut}.js`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/` | in progress | 2026-11-26 |

Status values: `in progress`, `blocked`, `ready for review`.

## Handoffs

Newest first. Each entry: who, what changed, what is unverified, what the next agent should do.

### 2026-11-26 claude -> humans
- Changed (branch claude/design-pass): notebook redesign, hard-meal support card, Need help, one outcome vocabulary, no scores for parents, clinician grid shows refusals and distress. Details: `docs/plans/2026-11-26-design-pass.md`.
- Unverified: real phones, live USDA and AI, desktop sidebars and clinician Care plan/Notes only re-coloured. New support wording is a draft for clinician review.
- Next: clinician reviews the wording; fix `viewingPatientUid` not resetting on sign-out (see the doc).

### 2026-11-22 claude -> humans / hermes
- Changed (branch claude/mobile-logging, stacked on claude/foundations): three-tap meal log, same-as-yesterday, recent foods, sheets and modals above the tab bar, no invented nutrition numbers. Details and screenshots in `docs/mobile/meal-logging-audit.md`.
- Unverified: real touch/iOS, the live USDA lookup (worker not run locally), the Week/Insights/Notes/Account tabs, clinician screens.
- Next: a clinician should confirm that "Partly" may map to the `difficult` status; decide whether parents see calorie numbers; then merge claude/foundations first.

<!-- example:
### 2026-11-22 claude -> hermes
- Changed: added `src/lib/foodSearch.js` + tests (branch claude/food-search).
- Unverified: USDA rate limits under load.
- Next: wire it into AddFoodSheet.jsx.
-->

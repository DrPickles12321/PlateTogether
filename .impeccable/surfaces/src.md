---
version: 1
slug: "src"
primary_target: "src"
related_targets: []
---

# Surface brief: Plate Together app (parent + clinician)

Scope: whole app, mode Operate. Parent on a phone first (PRODUCT.md). Clinician on a laptop second.
Task: log a meal in seconds; after a hard meal know what to do next; clinician sees exceptions first.
Constraints: no scores/streaks/comparisons for parents; no nutrient numbers in anorexia mode; teen may see parent screens; new clinical wording marked for clinician review.
Unresolved: whether "partly finished" equals `difficult` (clinician question); clinician-editable warning signs (needs storage decision).

## Direction contract
THESIS: The family's meal notebook. Each day is a ruled page the parent writes on; meals are lines, not cards. Refuses the wellness-tracker default of emoji tiles, KPI grids and gradient buttons.
OWN-WORLD: Composition-notebook paper (cool white, pale blue rules, one soft rose margin line), graphite text, ballpoint-blue ink for the parent's own entries and the primary action, highlighter yellow only for "look at this". Outcomes are marks (tick, half circle, cross, dash) with words. Atkinson Hyperlegible Next for UI, Shantell Sans for handwriting (day headings, notes). Square-ish 6px corners, hairline rules, no shadows except sheets.
STORY: The parent opens to today's page, sees which meals are written and which are blank, logs one in three taps, and after a hard meal the page answers with a calm next step and the care team one tap away. The clinician opens the family's file and sees highlighted exceptions first.
FIRST VIEWPORT: Phone. Handwritten day heading top-left, "Need help" ink button top-right. Below, four ruled meal lines (time in the margin, meal name, what was served, outcome mark). Empty lines say "Not written yet" with a ballpoint "Log" button in thumb reach. Tab bar is a notebook tab strip, text labels, no emoji.
FORM: Kitchen-table notebook (user-pinned; my list #1). Roll seed 4aa25e64 assigned #5, clinic case file, kept as the clinician-side topology: tabbed family file, exceptions highlighted.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

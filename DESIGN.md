---
name: Plate Together
description: Forest and sage. Calm, native-feeling lists on warm white, a forest band for the one thing that matters now, and one ink for every meal outcome.
colors:
  ink: "#345B4B"
  ink-hover: "#24443A"
  ink-light: "#E3EBE5"
  ink-mid: "#B9CBBF"
  on-ink: "#FAF9F6"
  on-ink-soft: "#D4E0D8"
  apricot: "#EBC5A5"
  highlight: "#F6E4D4"
  highlight-ink: "#6E4122"
  paper: "#FFFFFF"
  desk: "#FAF9F6"
  surface-warm: "#F3F1EC"
  rule: "#E4E5E1"
  rule-strong: "#D6D8D2"
  text-dark: "#252825"
  text-mid: "#4A504A"
  text-light: "#6B706B"
  border-mid: "#CFD1CB"
  outcome-ink: "#3E443F"
typography:
  family: "DM Sans"
  page-title: "34px / 700 / -0.02em"
  screen-question: "28px / 700 / -0.02em"
  row: "17px / 400-500"
  section-label: "13px / 600, forest"
  caption: "13px / 400, text-light"
radius:
  controls: "6px (buttons, inputs, segmented choices)"
  sections: "0 (bands, lists and panels are square and run edge to edge on phones)"
---

# Plate Together design system

Chosen on 2026-11-26 as the "fourth take" on the Claude Design canvas: the warmth and colour of
the second take with the calm lists and neutral meal marks of the third. It replaces the earlier
notebook system.

## Principles

1. **One thing at a time.** Each parent screen opens with a forest band (or an apricot band after a
   refused meal) that says the one thing that matters now. Everything under it is quieter.
2. **Outcomes are never graded by colour.** "Ate it all", "Ate some", "Didn't eat" and "Not served"
   all use the same ink (`outcome-ink`). The mark's shape carries the difference: full dot, half dot,
   empty ring, dash. A meal still to come is a small faint dot, never a ring. "Up next" is the only
   apricot mark.
3. **Square sections, slightly rounded controls.** Bands, lists and panels have square corners and
   run edge to edge on phones (bordered on all sides on desktop). Only buttons, inputs and choice
   chips are rounded, at 6px. Marks are the only fully round shapes.
4. **Lists, not cards.** Content sits in white lists with hairline dividers and a 20px inset, under
   small forest section labels. Support content sits in a flat sage panel.
5. **No AI tells.** No numbered circle badges, initials avatars, pill badges with icons, gradient
   backgrounds, or a subtitle under every heading.

## Colour roles

- **Forest (`ink`)**: the one main action per screen, the top band, section labels, links.
- **Sage (`ink-light`)**: support panels (at the table, tell your clinician, how hard was it).
- **Apricot (`apricot`, `highlight`)**: "up next", the refused-meal band, and clinician flags. Never
  used to mean "bad".
- **Warm white (`desk`)** page, **white (`paper`)** lists.

## Components

- `OutcomeMark` (src/components/Icon.jsx): marks `all`, `some`, `none`, `skip`, `next`, `later`.
- Outcome words and hints live in `OUTCOME_META` (src/lib/outcomes.js). Stored values are unchanged.
- Bottom tab bar: flat white, hairline on top, icon over word, forest when active.

## Screens built on this system

- Next meal (src/pages/NextMealView.jsx): forest band with the next meal, the day's four marks,
  then "For <meal>", the sage "At the table" panel and one "Log <meal>" button.
- Log a meal (src/pages/LogMealView.jsx): four outcome rows with hints and a checkmark, optional
  "How hard was it?" in sage, then Save. "Didn't eat" saves and opens the refusal plan.
- Refused meal (src/pages/RefusalPlanView.jsx): apricot band, the clinician's numbered plan as a
  plain list, a sage "Tell your clinician" panel.
- Week (src/pages/WeeklyView.jsx): forest band, plain-sentence highlights (src/lib/weekHighlights.js),
  then a meals-by-day grid of marks with a key.

Other screens inherit the tokens but keep their earlier layouts; the clinician views have not been
redesigned in this system yet.

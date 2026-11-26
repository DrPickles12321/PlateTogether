# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: a parent of a teenager in anorexia recovery, treated with family-based treatment (FBT).**
  The parent runs meals at home and logs them on a phone, usually one-handed, often right after a hard
  meal. When parent and clinician needs conflict, the parent on a phone wins.
- **Secondary: the family's clinician** (therapist or dietitian), usually on a laptop, reviewing the week
  before a session, writing notes and adjusting the care plan.
- **The teen sometimes sees the parent's screen.** Nothing on a parent screen may be harmful for a teen in
  recovery to see: no calorie or nutrient numbers in anorexia mode, no scores, streaks, or comparisons.

## Product Purpose

Help parents get through meals and give the clinician a clear, honest picture of the week between sessions.
Logging is only the input. Success: a parent logs a meal in seconds, knows what to do after a hard meal,
and the clinician sees refusals and distress without digging.

## Positioning

Built around FBT's shape: parents lead meals, a clinician coaches once a week, the app connects the two.
It is not a calorie tracker and not a self-tracking app for the person with the eating disorder.

## Operating Context

- Parent: at or right after the table, at home, often stressed, phone in one hand.
- Clinician: before or during a weekly session, on a laptop.
- Linking: a family code links a clinician to a parent; the parent can remove a clinician's access.
- A test-only switch (`?testmode`) picks General meal support or Anorexia (family-based).

## Capabilities and Constraints

- Parent: log meals (foods, how it went, distress before and after), meal times, supplements, notes to the
  clinician, read clinician notes, assigned challenge foods, a chat assistant, a non-urgent SOS to the care team.
- Clinician: week grid, week in review, insights, care plan (targets, supplements, challenges), notes.
- Stored meal outcomes are `okay`, `difficult`, `refused`, `skipped`. Whether "partly finished" equals
  `difficult` is an open clinician question.
- Stack: React 19, Vite, Tailwind 4, Firebase Realtime Database and Auth. Storage changes need an approved plan.
- Sensitive health data about minors. No new PHI sinks, no third-party SDKs that see meal or note content.

## Brand Commitments

- Name: Plate Together.
- Calm, warm, hand-made for this audience, not clinical. No purple gradients, no default Inter-on-white,
  no generic card grids (founders' direction in AGENTS.md).

## Evidence on Hand

- No real users, testimonials, or clinical endorsements yet. Do not invent any.
- Research notes: `docs/plans/2026-11-22-anorexia-focus.md` (not clinically reviewed).

## Product Principles

1. The hard moment comes first: after a refusal or high distress, the next step is obvious and one tap away.
2. Facts, not scores: parents see what happened and their clinician's words, never grades, streaks or comparisons.
3. The clinician sees exceptions first, with the entries behind every claim.
4. Support, never diagnose or prescribe. New clinical wording is marked for clinician review.
5. Seconds, not minutes: one way to log a meal, one vocabulary everywhere.

## Accessibility & Inclusion

WCAG AA contrast, 44px touch targets, real labels and focus states, works at 375px with touch only,
respects reduced motion. Users may be exhausted or distressed: plain words, short sentences.

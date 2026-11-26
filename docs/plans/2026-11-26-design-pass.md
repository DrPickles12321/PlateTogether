# Design pass: the family's meal notebook

Branch `claude/design-pass`. Fixes the UX problems found in the Impeccable critique
(`.impeccable/critique/2026-11-26T06-00-44Z__src.md`, score 20/40) and gives the app its own look.
Decisions came from the founders' answers on 2026-11-26: fix UX then redesign, "kitchen-table
notebook" feel, no scores for parents, a support message after hard meals, parent on a phone first,
and the teen may see the parent's screen.

## What changed

| Area | Before | After |
|---|---|---|
| Look | Warm cream, terracotta, emoji icons, pink gradient buttons, card grids | Composition-notebook paper, ballpoint-blue ink, one rose margin line, highlighter for "look at this"; drawn icons; Atkinson Hyperlegible Next + Shantell Sans |
| Today (phone) | Stack of cards, about 24 controls per open card | One ruled line per meal, time in the margin, one Log button |
| After a refusal | Nothing happened | A calm card under that meal: Message your care team, When to get help (tap-to-call 911 and 988) |
| Help | A collapsed card low on the page, anorexia mode only | Need help button at the top of Today in both modes |
| Outcome words | Three sets (Finished/Partly, Ok/Hard/No, Okay/Difficult) | One set everywhere: Finished, Partly, Refused, Skipped, each with a pen mark |
| Parent Week | Score chips, a day streak, colour-only dots | One line per day, a mark and a word per meal, no totals |
| Parent Insights | Okay-rate, week-on-week arrows, "You're doing great" | A message that reflects the week, the care team's note, hard meals to mention, challenge foods |
| Clinician grid | A refused meal with no food showed "—"; no distress | Outcome always shown, distress shown, refusals and distress 4-5 highlighted |
| Week in review | Future days listed as "nothing logged" | Only days that have happened count |
| Sign-in | Asked for a role every time | Asks only when creating an account; labelled fields |
| Accessibility | Secondary text at 2.7:1, 32px targets, unlabelled buttons | Secondary text at least 4.9:1, 44px targets, names on controls, no text under 12px |

## New clinical wording (draft, needs clinician review)

AGENTS.md asks for a before/after example for any new wording the app says about meals.
Both strings live in `src/lib/supportCopy.js` and are covered by `src/lib/outcomes.test.js`
(no numbers, no calorie or weight words, points to people rather than advice).

**After a refused meal, or distress 4 or 5**

- Before: nothing. The meal row turned red.
- After: "That meal was hard. Hard meals happen in recovery. You don't have to work this out alone."
  Buttons: Message your care team, When to get help, Close. Under the message box: "Messages are
  not watched around the clock. In an emergency, call 911."

**Top of the parent's Insights page**

- Before: "You're doing great — 9 meals went well this week! 🌱" (shown even after refusals)
- After, a week with hard meals: "This week had some hard meals. That is part of recovery, and you kept going."
- After, an ordinary week: "You kept the notebook going this week. Bring anything on your mind to your next session."
- After, nothing logged: "Nothing written down yet this week. Log a meal on the Today page and it will show up here."

Questions for a clinician: is distress 4 or more the right trigger? Is "Hard meals happen in recovery"
the right first line? Should the card also offer the family's own plan (for example "stay at the
table, calm voice") once clinicians can write it?

## Verified

- `npm test`: 124 passed. `npm run build`: passes. `npm run lint`: 24 errors, all existing
  "setState in effect" and similar; `main` had 46.
- Clicked through on a local emulator with fake accounts: phone Today, hard-meal card, Need help
  sheet, Week, Insights, Account; desktop Today; clinician family file and Insights.

## Not verified or not done

- Real iPhone/Android touch, the live USDA lookup, and the AI assistant (worker not running locally).
- Desktop food sidebar, clinician notes sidebar, Care plan and clinician Notes pages were moved
  to the new palette but not restructured.
- Existing bug found while testing, not fixed here: after one account signs out and another signs
  in on the same browser tab, `viewingPatientUid` is not reset, and the care-team self-heal wrote
  the parent's own account into their care team. The clinician's chosen family is also lost on reload.
  Both live in `src/contexts/FirebaseDataContext.jsx`.

# Clinician statistics: a draft to react to

**For:** an eating-disorder clinician (ideally FBT-trained) who would use Plate Together between sessions.
**Time needed:** about 25 minutes.
**How to use:** for each row, write **Keep**, **Change** (say how) or **Cut** in the last column, and answer the
questions in bold. This is roadmap phase 3, step 1 (`docs/plans/2026-11-26-roadmap.md`). Nothing gets built
until a clinician has marked this up.

**What the app records today.** Per meal (breakfast, lunch, snack, dinner): one of four outcomes, the foods
served with a type (familiar, working on, challenge, or none), distress before and after (1 to 5, optional),
and the time. Also: supplements given, notes from the parent, requests for support, the challenge foods a
clinician assigned, and the family's care plan. The app does **not** record weight, portion sizes, or the
amount eaten beyond the four outcomes. It never will record weight from the parent side.

The four outcomes, as parents see them: **Ate it all** (`okay`), **Ate some** (`difficult`), **Didn't eat**
(`refused`), **Not served** (`skipped`).

**Rules every metric follows** (from `AGENTS.md`):
- Facts from the family's own logs, computed the same way every time. No AI decides a number.
- Every number opens to the meals behind it.
- Clinicians only. Parents see no scores, only plain sentences on their Week screen (see Q10).
- Nothing here diagnoses or labels the patient.

---

## 1. The week at a glance

| # | Metric | How it is worked out | In the app today? | Keep / Change / Cut |
|---|---|---|---|---|
| 1.1 | Meals by outcome | Count of each outcome this week, out of the meals that have passed | Yes, Week in review | |
| 1.2 | Outcome grid | Day by meal, one mark per cell, blank if not logged | Yes, Overview grid | |
| 1.3 | Hard meals | Every "Ate some" and "Didn't eat", with day and meal | Yes, Worth talking about | |
| 1.4 | Meals not logged | Meal slots that passed with nothing recorded | Partly (days only) | |
| 1.5 | Logging streak | Days in a row with at least one meal logged | No | |

**Questions**
- **Q1.** Should "Ate some" count as a hard meal next to "Didn't eat", or be shown separately? Today both are
  "hard meals".
- **Q2.** Is a meal that was not logged worth showing at all? It may mean a missed meal or just a busy parent.

## 2. Patterns across the week

| # | Metric | How it is worked out | In the app today? | Keep / Change / Cut |
|---|---|---|---|---|
| 2.1 | Hard meals by meal | Which of breakfast, lunch, snack, dinner is hardest this week | Yes, Insights | |
| 2.2 | Hard meals by weekday | For example, "3 of the 4 refusals were on school days" | No | |
| 2.3 | Hard meals by time of day | Using the logged meal time | No | |
| 2.4 | Meal timing | Typical time for each meal, and whether it stays within 90 minutes across the week | Yes, Eating rhythm | |
| 2.5 | Timing drift | A meal 45 minutes or more later (or earlier) than the past 4 weeks | Yes, flagged change | |
| 2.6 | Food types served | Count of familiar, working on and challenge foods; a type that disappears | Yes, flagged change | |

**Questions**
- **Q3.** Which of these would you actually use in a session? Rank your top three.
- **Q4.** Is 90 minutes the right window for "steady" timing, and 45 minutes the right size for "drift"?

## 3. Distress

| # | Metric | How it is worked out | In the app today? | Keep / Change / Cut |
|---|---|---|---|---|
| 3.1 | Average distress after meals | This week, and the change from last week | Yes | |
| 3.2 | Distress before vs. after | Average rise or fall across a meal | No | |
| 3.3 | Distress by meal | Which meal carries the most distress | No | |
| 3.4 | Distress trend | Weekly average over 4 to 8 weeks | No | |

**Questions**
- **Q5.** Distress is optional and parent-rated. Is it reliable enough to trend, or should it only appear as
  single entries?

## 4. Challenge foods

| # | Metric | How it is worked out | In the app today? | Keep / Change / Cut |
|---|---|---|---|---|
| 4.1 | Challenge foods tried | Each one, the meal, and its outcome | Yes, Worth talking about | |
| 4.2 | Assigned vs. tried | Of the foods you assigned, which were offered this week | No | |
| 4.3 | How each challenge food went over time | Outcome each time it was served | No | |

**Questions**
- **Q6.** Should a challenge food count as "tried" if the meal was "Ate some"?

## 5. Change over time

| # | Metric | How it is worked out | In the app today? | Keep / Change / Cut |
|---|---|---|---|---|
| 5.1 | Weekly trend | Share of meals "Ate it all", per week, for the last 6 weeks | Yes, Insights | |
| 5.2 | Change against the family's own past | This week vs. the past 4 weeks; flags a rise of 1.5 times or more | Yes, flagged change | |
| 5.3 | Best and hardest week | Over the last 8 weeks, with the reason | No | |

**Questions**
- **Q7.** Should trends compare against the family's own past (as now), or against a goal you set? We would
  never compare to other families.

## 6. Nutrition (clinicians only)

Foods are matched to USDA FoodData Central. The app knows nutrition **per standard serving**, not what was on
the plate or how much was eaten, so any energy number is a rough range at best.

| # | Metric | How it is worked out | In the app today? | Keep / Change / Cut |
|---|---|---|---|---|
| 6.1 | Estimated energy range per day | Per-serving values for foods in meals marked "Ate it all" or "Ate some"; shown as a range | No | |
| 6.2 | Food groups covered | Protein, dairy, grains, fats, fruit and vegetables seen this week | No | |
| 6.3 | Supplements given | Days each prescribed supplement was logged | Yes, parent checklist | |

**Questions**
- **Q8.** Is an energy range useful when portions are unknown, or does it mislead more than it helps? Should
  we add a portion size ("small / usual / large") to logging instead?
- **Q9.** Today a clinician can switch nutrition numbers on for a parent. Should any of 6.1 to 6.2 ever be
  visible to parents?

## 7. What should never be shown

Please add anything to this list.

- Weight, BMI, or anything that implies a weight target.
- Calories "burned", or any number that could be used to compensate.
- A single score or grade for the patient, the parent or the week.
- Comparisons between families.

**Questions**
- **Q10.** Parents now see plain sentences only, no scores or percentages. Is that right?
- **Q11.** What warning signs would you want flagged straight away rather than at the next session? Today
  only a request for support is flagged. Anything flagged would route to a human message, not advice.
- **Q12.** Would a printable one-page week (roadmap 3.4) be used, and what must be on it?

---

## Where the answers go

The agreed list becomes `src/lib/clinicianStats.js`: one pure module, tested, building on `sessionPrep.js`,
`weekStats.js`, `trends.js`, `mealTiming.js` and `anomalyDetection.js`. The clinician Overview and Insights
tabs then read from it. Any metric marked **Cut** is removed from the app where it already exists.

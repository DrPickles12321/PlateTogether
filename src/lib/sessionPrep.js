// Week-in-review for the clinician, built only from what the family logged. Pure and model-free: every
// number comes with the entries behind it so the clinician can check it, and nothing here diagnoses.
// Inputs match the shapes used elsewhere:
//   mealStatuses: { [date]: { [meal]: 'okay' | 'difficult' | 'refused' | 'skipped' } }
//   mealDistress: { [date]: { [meal]: { pre?, post? } } }   (1-5)
//   allMealItems: { [date]: { [meal]: [{ name, category }] } }

import { MEAL_KEYS } from './weekSummary'

const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' }
// "difficult" is how the app stores "partly finished" (needs clinician confirmation, see the focus plan).
const HARD = ['difficult', 'refused']

function avg(values) {
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null
}

function postDistress(mealDistress, isoDates) {
  const out = []
  for (const iso of isoDates) {
    for (const d of Object.values(mealDistress[iso] || {})) if (d?.post) out.push(d.post)
  }
  return out
}

/**
 * @param {object} args
 * @param {string[]} args.isoDates this week, chronological
 * @param {string[]} [args.previousIsoDates] the week before, for the distress comparison
 * @param {string} [args.today] YYYY-MM-DD; days after it have not happened yet, so they are
 *   neither counted as slots nor listed as "nothing logged". Omit to treat the whole week as past.
 */
export function buildSessionPrep({ mealStatuses = {}, mealDistress = {}, allMealItems = {}, isoDates = [], previousIsoDates = [], today = null }) {
  const pastDates = today ? isoDates.filter(iso => iso <= today) : isoDates
  const counts = { okay: 0, difficult: 0, refused: 0, skipped: 0 }
  const hardEntries = []
  const hardByMeal = Object.fromEntries(MEAL_KEYS.map(k => [k, 0]))
  const loggedByDay = {}

  for (const iso of isoDates) {
    loggedByDay[iso] = 0
    for (const meal of MEAL_KEYS) {
      const status = mealStatuses[iso]?.[meal]
      if (!status || counts[status] === undefined) continue
      counts[status] += 1
      loggedByDay[iso] += 1
      if (HARD.includes(status)) {
        hardByMeal[meal] += 1
        hardEntries.push({ date: iso, meal, mealLabel: MEAL_LABEL[meal], status })
      }
    }
  }

  const logged = counts.okay + counts.difficult + counts.refused + counts.skipped
  const notLoggedDays = pastDates.filter(iso => loggedByDay[iso] === 0)

  // Hardest meal only when one meal clearly leads; a tie is not a finding.
  const ranked = MEAL_KEYS.filter(k => hardByMeal[k] > 0).sort((a, b) => hardByMeal[b] - hardByMeal[a])
  const hardestMeal = ranked.length && (ranked.length === 1 || hardByMeal[ranked[0]] > hardByMeal[ranked[1]])
    ? { meal: ranked[0], label: MEAL_LABEL[ranked[0]], count: hardByMeal[ranked[0]] }
    : null

  const challengeAttempts = []
  for (const iso of isoDates) {
    for (const meal of MEAL_KEYS) {
      for (const food of allMealItems[iso]?.[meal] || []) {
        if (food?.category === 'challenge') {
          challengeAttempts.push({ date: iso, meal, mealLabel: MEAL_LABEL[meal], name: food.name, status: mealStatuses[iso]?.[meal] || null })
        }
      }
    }
  }

  const thisWeekPost = avg(postDistress(mealDistress, isoDates))
  const lastWeekPost = avg(postDistress(mealDistress, previousIsoDates))

  return {
    logged,
    totalSlots: pastDates.length * MEAL_KEYS.length,
    counts,
    notLoggedDays,
    hardestMeal,
    hardEntries,
    challengeAttempts,
    distress: {
      avgPost: thisWeekPost,
      previousAvgPost: lastWeekPost,
      // Only a comparison when both weeks have ratings; direction is descriptive, not a judgment.
      change: thisWeekPost !== null && lastWeekPost !== null ? Math.round((thisWeekPost - lastWeekPost) * 10) / 10 : null,
    },
  }
}

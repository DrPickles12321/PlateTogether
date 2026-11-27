// A one-page week for a family, to read before a session or print for one (roadmap 3.4). Built only
// from the family's logs, on top of buildSessionPrep, so every line traces back to a logged meal.
// It changes when the phase 3 metric list is agreed (docs/clinical/2026-11-27-clinician-metrics-draft.md).

import { buildSessionPrep } from './sessionPrep'
import { MEAL_KEYS } from './weekSummary'

/**
 * @param {object} args
 * @param {string[]} args.isoDates the week shown, chronological
 * @param {string[]} [args.previousIsoDates] the week before, for the distress comparison
 * @param {string} args.today YYYY-MM-DD
 * @param {Array<{date, body}>} [args.parentNotes]
 */
export function buildSessionSummary({ mealStatuses = {}, mealDistress = {}, allMealItems = {}, parentNotes = [], isoDates, previousIsoDates = [], today }) {
  const prep = buildSessionPrep({ mealStatuses, mealDistress, allMealItems, isoDates, previousIsoDates, today })

  const days = isoDates.map(date => ({
    date,
    future: date > today,
    meals: Object.fromEntries(MEAL_KEYS.map(meal => {
      const status = mealStatuses[date]?.[meal] || null
      const foods = (allMealItems[date]?.[meal] || []).map(f => f?.name).filter(Boolean)
      const d = mealDistress[date]?.[meal] || null
      return [meal, { status, foods, distress: d && (d.pre || d.post) ? { pre: d.pre || null, post: d.post || null } : null }]
    })),
  }))

  const first = isoDates[0], last = isoDates[isoDates.length - 1]
  const notes = parentNotes
    .filter(n => n?.body && n.date >= first && n.date <= last)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(n => ({ date: n.date, body: n.body }))

  return { prep, days, notes }
}

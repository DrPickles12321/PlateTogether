// A one-page week for a family, to read before a session or print for one (roadmap 3.4). Built only
// from the family's logs, on top of buildSessionPrep, so every line traces back to a logged meal.
// It changes when the phase 3 metric list is agreed (docs/clinical/2026-11-27-clinician-metrics-draft.md).

import { buildSessionPrep } from './sessionPrep'
import { MEAL_KEYS } from './weekSummary'
import { DEBRIEF } from './supportCopy'

const DAY = 86400000
const toUtc = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }
const fromUtc = ms => new Date(ms).toISOString().slice(0, 10)

// The days after a clinician's last session, up to and including today, capped at `max` days so a
// family not seen for months doesn't produce an unreadable page. Empty when the session was today.
export function datesSince(lastSessionIso, today, max = 28) {
  if (!lastSessionIso || lastSessionIso >= today) return []
  const start = Math.max(toUtc(lastSessionIso) + DAY, toUtc(today) - (max - 1) * DAY)
  const out = []
  for (let t = start; t <= toUtc(today); t += DAY) out.push(fromUtc(t))
  return out
}

// The same number of days just before `isoDates`, for comparisons.
export function datesBefore(isoDates) {
  if (!isoDates.length) return []
  const first = toUtc(isoDates[0])
  return isoDates.map((_, i) => fromUtc(first - (isoDates.length - i) * DAY))
}

// Hard meals in the range, for the clinician: whether the calm screen was used, and the debrief answers in
// the parent's own words (lib/events.js buildFamilyState gives the list). Oldest first.
const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' }
export function hardMealEntries(hardMeals = [], isoDates = []) {
  if (!isoDates.length) return []
  const first = isoDates[0], last = isoDates[isoDates.length - 1]
  const C = DEBRIEF.clinician
  return hardMeals
    .filter(h => h?.date >= first && h.date <= last)
    .sort((a, b) => a.date.localeCompare(b.date) || MEAL_KEYS.indexOf(a.meal) - MEAL_KEYS.indexOf(b.meal) || (a.startedAt ?? 0) - (b.startedAt ?? 0))
    .map(h => {
      const d = h.debrief || {}
      const lines = []
      if (h.startedAt != null) lines.push(C.calm)
      if (d.hard === 'worried') lines.push(C.worried)
      else if (d.hard) lines.push(`${C.hard}: ${DEBRIEF.options.hard[d.hard]}`)
      if (d.helped) lines.push(`${C.helped}: ${DEBRIEF.options.helped[d.helped]}`)
      if (d.parent) lines.push(`${C.parent}: ${DEBRIEF.options.parent[d.parent]}`)
      if (!h.debrief) lines.push(C.none)
      return { key: h.ref, date: h.date, meal: h.meal, mealLabel: MEAL_LABEL[h.meal] || h.meal, lines, worried: d.hard === 'worried', needSupport: d.parent === 'need_support' }
    })
}

export function sessionAgo(lastSessionIso, today) {
  if (!lastSessionIso) return null
  const days = Math.round((toUtc(today) - toUtc(lastSessionIso)) / DAY)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

/**
 * @param {object} args
 * @param {string[]} args.isoDates the days shown, chronological
 * @param {string[]} [args.previousIsoDates] the week before, for the distress comparison
 * @param {string} args.today YYYY-MM-DD
 * @param {Array<{date, body}>} [args.parentNotes]
 * @param {Array} [args.hardMeals] from buildFamilyState: calm-screen uses and debriefs
 */
export function buildSessionSummary({ mealStatuses = {}, mealDistress = {}, allMealItems = {}, parentNotes = [], hardMeals = [], isoDates, previousIsoDates = [], today }) {
  const prep = buildSessionPrep({ mealStatuses, mealDistress, allMealItems, isoDates, previousIsoDates, today })

  const days = isoDates.map(date => ({
    date,
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

  return { prep, days, notes, hardMeals: hardMealEntries(hardMeals, isoDates) }
}

// Parents in sync (roadmap F3): for the clinician, how logging and hard meals spread across the family's
// caregivers, meals and homes over the last two weeks. Facts only, each with its counts; nothing about which
// parent is "better". Being united predicts weight gain in FBT (framework problem 5), so gaps are worth a word in
// session, not a verdict. Uses who logged each meal (lib/events.js loggedBy) and each caregiver's home (B6).
import { MEAL_KEYS } from './weekSummary'

const HARD = new Set(['difficult', 'refused'])
const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' }
const HOME_LABEL = { main: 'Home 1', second: 'Home 2' }

export function parentsInSync({ mealStatuses = {}, mealLoggedBy = {}, caregivers = [], isoDates = [] }) {
  const name = uid => caregivers.find(c => c.uid === uid)?.label || 'another caregiver'
  const homeOf = uid => caregivers.find(c => c.uid === uid)?.household || 'main'
  const rows = new Map(caregivers.map(c => [c.uid, { uid: c.uid, name: c.label, household: c.household, logged: 0, hard: 0 }]))
  const byMeal = Object.fromEntries(MEAL_KEYS.map(m => [m, new Map()]))
  const byHome = new Map()
  let total = 0

  for (const date of isoDates) {
    for (const meal of MEAL_KEYS) {
      const status = mealStatuses[date]?.[meal]
      const by = mealLoggedBy[date]?.[meal]
      if (!status || !by || status === 'skipped') continue
      total++
      if (!rows.has(by)) rows.set(by, { uid: by, name: name(by), household: homeOf(by), logged: 0, hard: 0 })
      const r = rows.get(by)
      r.logged++
      if (HARD.has(status)) r.hard++
      byMeal[meal].set(by, (byMeal[meal].get(by) || 0) + 1)
      const home = homeOf(by)
      byHome.set(home, (byHome.get(home) || 0) + 1)
    }
  }

  const caregiverRows = [...rows.values()]
  const notes = []
  if (caregiverRows.length >= 2 && total > 0) {
    for (const r of caregiverRows) if (r.logged === 0) notes.push(`${r.name} logged no meals in these two weeks.`)
    const withEnough = caregiverRows.filter(r => r.logged >= 3)
    if (withEnough.length >= 2) {
      const rate = r => r.hard / r.logged
      const [hi, lo] = [...withEnough].sort((a, b) => rate(b) - rate(a))
      if (rate(hi) >= 2 * rate(lo) && hi.hard >= 2) {
        notes.push(`Meals ${hi.name} logged were hard more often: ${hi.hard} of ${hi.logged}, against ${lo.hard} of ${lo.logged} for ${lo.name}.`)
      }
    }
    for (const meal of MEAL_KEYS) {
      const counts = [...byMeal[meal].entries()]
      const sum = counts.reduce((s, [, n]) => s + n, 0)
      const [topUid, topN] = counts.sort((a, b) => b[1] - a[1])[0] || []
      if (sum >= 4 && topN === sum) notes.push(`${MEAL_LABEL[meal]} was logged only by ${name(topUid)} (${sum} times).`)
    }
  }

  return {
    total,
    caregiverRows,
    byHome: [...byHome.entries()].map(([home, logged]) => ({ home, label: HOME_LABEL[home] || home, logged })),
    twoHomes: caregivers.some(c => c.household === 'second'),
    notes,
  }
}

// The last `n` local days, oldest first, ending today.
export function lastDays(n = 14, today = new Date()) {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return out
}

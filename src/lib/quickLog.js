// Logic for the three-tap meal log: pick a meal, say how it went, say how hard it was.
// Kept free of Firebase and React so it is easy to test.

// "Ate some" maps to the existing 'difficult' status so trends and the clinician
// views keep working without a data-model change. Confirm this mapping with a clinician.
export const OUTCOMES = [
  { key: 'finished', label: 'Ate it all', status: 'okay' },
  { key: 'partly',   label: 'Ate some', status: 'difficult' },
  { key: 'refused',  label: "Didn't eat", status: 'refused' },
]

export const STATUS_TO_OUTCOME = { okay: 'finished', difficult: 'partly', refused: 'refused' }

// Difficulty reuses the existing 1 (calm) to 5 (very hard) scale, stored as distress.post.
export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5]

// Returns the Firebase paths (relative to the meal) to write for one tap.
export function quickLogPatch({ outcome, difficulty } = {}) {
  const patch = {}
  if (outcome != null) {
    const found = OUTCOMES.find(o => o.key === outcome)
    if (!found) throw new Error(`Unknown outcome: ${outcome}`)
    patch.status = found.status
  }
  if (difficulty != null) {
    if (!DIFFICULTY_LEVELS.includes(difficulty)) throw new Error(`Unknown difficulty: ${difficulty}`)
    patch['distress/post'] = difficulty
  }
  return patch
}

// 'YYYY-MM-DD' minus n days, using UTC so daylight saving cannot shift the date.
export function shiftIsoDate(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// What was eaten, without how it went: status and portion belong to one day only.
function cleanFood(food) {
  // eslint-disable-next-line no-unused-vars
  const { status, portion, ...rest } = food
  return rest
}

const foodKey = f => f.id || String(f.name || '').trim().toLowerCase()

// The same meal from the day before, ready to add again. Empty when nothing was logged.
export function sameAsYesterday(allMealItems, date, mealType) {
  const items = allMealItems?.[shiftIsoDate(date, -1)]?.[mealType] || []
  return items.filter(f => f && f.name).map(cleanFood)
}

// Foods the family eats often, most used first, drawn from the last `days` days.
// Foods already in `exclude` (the current meal) are left out. Foods from the same
// meal type rank ahead of foods from other meals.
export function recentFoods(allMealItems, { date, mealType, days = 14, limit = 8, exclude = [] } = {}) {
  const earliest = shiftIsoDate(date, -days)
  const skip = new Set(exclude.map(foodKey))
  const seen = new Map()
  for (const [d, meals] of Object.entries(allMealItems || {})) {
    if (d < earliest || d >= date) continue
    for (const [mt, items] of Object.entries(meals || {})) {
      for (const food of items || []) {
        if (!food || !food.name) continue
        const key = foodKey(food)
        if (skip.has(key)) continue
        const entry = seen.get(key) || { food: cleanFood(food), count: 0, sameMeal: 0, last: '' }
        entry.count += 1
        if (mt === mealType) entry.sameMeal += 1
        if (d > entry.last) { entry.last = d; entry.food = cleanFood(food) }
        seen.set(key, entry)
      }
    }
  }
  return [...seen.values()]
    .sort((a, b) => b.sameMeal - a.sameMeal || b.count - a.count || (a.last < b.last ? 1 : -1))
    .slice(0, limit)
    .map(e => e.food)
}

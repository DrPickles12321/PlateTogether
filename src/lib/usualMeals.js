// "Usual meals": a meal the family serves often, saved once and added again in one tap.
// Stored at users/{parent}/usualMeals/{id} = { id, name, mealType, foods: [{ id, name, category }], createdAt }.
// The limits below match database.rules.json. Pure, so it is easy to test.

export const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner']
export const MAX_NAME = 60
export const MAX_FOODS = 12
const CATEGORIES = ['familiar', 'working_on', 'challenge']

const clean = s => String(s || '').trim().replace(/\s+/g, ' ')

// A food as stored in a usual meal: just enough to add it again even if it was later deleted.
function snapshot(food) {
  const name = clean(food?.name).slice(0, 80)
  if (!name) return null
  return {
    id: String(food.id || ''),
    name,
    category: CATEGORIES.includes(food.category) ? food.category : 'familiar',
  }
}

// The record to save, or null when there's nothing worth saving (no name, a bad meal type, or fewer
// than two foods: one food is already a single tap).
export function buildUsualMeal({ id, name, mealType, foods = [], now = new Date().toISOString() } = {}) {
  const n = clean(name).slice(0, MAX_NAME)
  if (!n || !MEAL_TYPES.includes(mealType)) return null
  const seen = new Set()
  const list = []
  for (const f of foods) {
    const s = snapshot(f)
    const key = s && (s.id || s.name.toLowerCase())
    if (!s || seen.has(key)) continue
    seen.add(key)
    list.push(s)
    if (list.length >= MAX_FOODS) break
  }
  if (list.length < 2) return null
  return { id, name: n, mealType, foods: list, createdAt: now }
}

// Usual meals for one meal type, newest first, ignoring anything malformed.
export function usualMealsFor(raw, mealType) {
  return Object.values(raw || {})
    .filter(m => m && m.mealType === mealType && typeof m.name === 'string' && Array.isArray(m.foods) && m.foods.length)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

// A starting name for the save box: "Usual dinner", then "Usual dinner 2", and so on.
export function suggestName(mealLabel, existing = []) {
  const base = `Usual ${String(mealLabel || 'meal').toLowerCase()}`
  const taken = new Set(existing.map(m => clean(m.name).toLowerCase()))
  if (!taken.has(base.toLowerCase())) return base
  for (let i = 2; i < 100; i++) if (!taken.has(`${base} ${i}`.toLowerCase())) return `${base} ${i}`
  return base
}

// The foods to add when a usual meal is tapped: the family's current record for each food when it
// still exists (so a renamed or re-typed food stays current), skipping what is already in the meal.
export function foodsToAdd(usualMeal, { mealItems = [], foodItems = [] } = {}) {
  const inMeal = new Set(mealItems.map(f => f.id || clean(f.name).toLowerCase()))
  const byId = new Map(foodItems.map(f => [f.id, f]))
  const byName = new Map(foodItems.map(f => [clean(f.name).toLowerCase(), f]))
  const out = []
  for (const s of usualMeal?.foods || []) {
    const current = (s.id && byId.get(s.id)) || byName.get(clean(s.name).toLowerCase()) || s
    const key = current.id || clean(current.name).toLowerCase()
    if (inMeal.has(key)) continue
    inMeal.add(key)
    out.push(current)
  }
  return out
}

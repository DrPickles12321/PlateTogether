// Ranking for the add-food sheet: the family's own foods come first, ordered by how often they are
// served at this meal, and a new food is only offered when nothing in the family's list matches.
// Pure (no Firebase, no React) so the ordering is easy to test.
import Fuse from 'fuse.js'
import { shiftIsoDate } from './quickLog'

const norm = s => String(s || '').trim().toLowerCase()
const keyOf = f => f?.id || norm(f?.name)

// How often each food was served in the `days` days before `date`, at this meal and at any meal.
// Keyed by food id (or lower-cased name for foods logged without one).
export function foodUsage(allMealItems = {}, { date, mealType, days = 28 } = {}) {
  const earliest = shiftIsoDate(date, -days)
  const usage = new Map()
  for (const [d, meals] of Object.entries(allMealItems || {})) {
    if (d < earliest || d >= date) continue
    for (const [mt, items] of Object.entries(meals || {})) {
      for (const food of items || []) {
        if (!food?.name) continue
        const k = keyOf(food)
        const u = usage.get(k) || { atMeal: 0, any: 0, last: '' }
        u.any += 1
        if (mt === mealType) u.atMeal += 1
        if (d > u.last) u.last = d
        usage.set(k, u)
      }
    }
  }
  return usage
}

const EMPTY = { atMeal: 0, any: 0, last: '' }
const usageOf = (usage, food) => usage.get(food.id) || usage.get(norm(food.name)) || EMPTY

function byUse(usage) {
  return (a, b) => {
    const ua = usageOf(usage, a), ub = usageOf(usage, b)
    return ub.atMeal - ua.atMeal || ub.any - ua.any || (ua.last < ub.last ? 1 : ua.last > ub.last ? -1 : 0) ||
      a.name.localeCompare(b.name)
  }
}

// The family's foods served at this meal recently, most often first. Shown before anything is typed.
export function usualFoods({ foods = [], allMealItems = {}, date, mealType, days = 28, limit = 8 } = {}) {
  const usage = foodUsage(allMealItems, { date, mealType, days })
  return foods.filter(f => usageOf(usage, f).atMeal > 0).sort(byUse(usage)).slice(0, limit)
}

// 4 exact, 3 starts with the query, 2 a word starts with it, 1 contains it (from three letters,
// so "ch" doesn't match "sandwich"), 0 no match.
export function matchScore(name, query) {
  const n = norm(name), q = norm(query)
  if (!q) return 0
  if (n === q) return 4
  if (n.startsWith(q)) return 3
  if (n.split(/[\s,()/-]+/).some(w => w.startsWith(q))) return 2
  if (q.length >= 3 && n.includes(q)) return 1
  return 0
}

// Whether to offer new foods yet: at two letters the family's own matches are enough; new-food
// rows appear from three letters, or straight away when nothing of the family's matches.
export function showNewFoods(query, familyMatches = 0) {
  const q = norm(query)
  return q.length >= 3 || (q.length >= 2 && familyMatches === 0)
}

// The family's foods that match what was typed: best match first, then most used at this meal.
// Typos fall back to a fuzzy match so "yoghurt" still finds "Yogurt".
export function searchFamilyFoods({ foods = [], allMealItems = {}, date, mealType, query = '', days = 28 } = {}) {
  const q = norm(query)
  if (!q) return []
  const usage = foodUsage(allMealItems, { date, mealType, days })
  const scored = foods.map(f => ({ food: f, score: matchScore(f.name, q) }))
  // Typo matching only on longer words: on short ones it matches nearly everything.
  if (q.length >= 5) {
    const fuzzy = new Set(new Fuse(foods, { keys: ['name'], threshold: 0.3, ignoreLocation: true })
      .search(q).map(r => keyOf(r.item)))
    for (const s of scored) if (s.score === 0 && fuzzy.has(keyOf(s.food))) s.score = 0.5
  }
  const use = byUse(usage)
  return scored.filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score || use(a.food, b.food))
    .map(s => s.food)
}

// A typed name as it should be saved: trimmed, single spaces, first letter capitalised
// ("garlic  bread " -> "Garlic bread"). The rest is left alone so "BLT" or "iced tea" survive.
export function tidyName(name) {
  const s = String(name || '').trim().replace(/\s+/g, ' ')
  return s ? s[0].toLocaleUpperCase() + s.slice(1) : ''
}

// True when what was typed can become a new food: long enough and not already in the family's list.
export function canAddAsNew(query, foods = []) {
  const q = norm(query)
  return q.length >= 2 && !foods.some(f => norm(f.name) === q)
}

// Foods the family doesn't have yet, from the curated list and the USDA search, without duplicates.
export function newFoodSuggestions({ query = '', curated = [], usda = [], existingNames = [], limit = 6 } = {}) {
  const q = norm(query)
  if (q.length < 2) return []
  const have = new Set(existingNames.map(norm))
  const seen = new Set()
  const out = []
  const curatedHits = curated.filter(c => matchScore(c.name, q) > 0)
    .sort((a, b) => matchScore(b.name, q) - matchScore(a.name, q))
  for (const item of [...curatedHits, ...usda]) {
    const n = norm(item?.name)
    if (!n || n === q || have.has(n) || seen.has(n)) continue
    seen.add(n)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

// USDA FoodData Central helpers for the Worker: map a food to our coarse group, pull the core
// macros, and turn raw search results into a short list of readable names. Pure (no fetch), so it
// is tested directly (worker/src/usda.test.js).

// Whole and generic foods first. Branded products only when these find too little.
export const WHOLE_FOODS = ['Foundation', 'SR Legacy', 'Survey (FNDDS)']
export const BRANDED = ['Branded']

// Map a USDA foodCategory to our coarse food group, matching the plate_zone values used by the local
// nutrition data (grain/produce/protein/dairy/mixed).
export function mapCategoryToGroup(cat) {
  const c = (typeof cat === 'string' ? cat : cat?.description || '').toLowerCase()
  if (!c) return 'mixed'
  const has = (...ws) => ws.some(w => c.includes(w))
  if (has('fruit', 'apple', 'banana', 'berr', 'grape', 'melon', 'citrus', 'orange', 'peach', 'pear', 'plum', 'mango', 'pineapple', 'cherry')) return 'produce'
  if (has('vegetable', 'potato', 'carrot', 'broccoli', 'spinach', 'lettuce', 'tomato', 'beans', 'peas', 'corn', 'squash', 'pepper', 'onion', 'greens')) return 'produce'
  if (has('grain', 'pasta', 'bread', 'cereal', 'rice', 'oat', 'wheat', 'flour', 'baked', 'cracker', 'noodle')) return 'grain'
  if (has('dairy', 'milk', 'cheese', 'yogurt', 'egg', 'butter', 'cream')) return 'dairy'
  if (has('poultry', 'chicken', 'turkey', 'beef', 'pork', 'lamb', 'veal', 'fish', 'salmon', 'tuna', 'shellfish', 'shrimp', 'sausage', 'meat', 'legume', 'nut', 'seed', 'tofu', 'bacon')) return 'protein'
  return 'mixed'
}

// Pull the core macros out of a USDA food's foodNutrients array.
export function extractNutrients(food) {
  const out = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  for (const n of food?.foodNutrients || []) {
    const name = (n.nutrientName || n.nutrient?.name || '').toLowerCase()
    const unit = (n.unitName || n.nutrient?.unitName || '').toLowerCase()
    const val = typeof n.value === 'number' ? n.value : (typeof n.amount === 'number' ? n.amount : 0)
    if (name === 'energy' && unit === 'kcal') { if (!out.calories) out.calories = val }
    else if (name.startsWith('protein')) out.protein_g = val
    else if (name.startsWith('carbohydrate')) out.carbs_g = val
    else if (name.startsWith('total lipid')) out.fat_g = val
    else if (name.startsWith('fiber')) out.fiber_g = val
  }
  for (const k in out) out[k] = Math.round(out[k] * 10) / 10
  return out
}

// USDA labels written for databases ("Garlic bread, NFS", "GARLIC BREAD", "Milk, whole, 3.25%
// milkfat, with added vitamin D") turned into something a parent would write: no "NFS"/"NS as
// to ..." filler, sentence case, at most three comma-separated parts and 60 characters.
export function tidyUsdaName(description) {
  let s = String(description || '')
    // Package sizes and counts on branded products ("1.8 Ounce", "10 Pack", "Each") say nothing about the food.
    .replace(/\b\d+(\.\d+)?\s*(fl\.?\s*oz|ounces?|oz|grams?|g|lbs?|ct|count)\b\.?/gi, ' ')
    .replace(/\b\d+\s*(pack|pk)\b|\beach\b/gi, ' ')
    .replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim()
  if (!s) return ''
  const letters = s.replace(/[^A-Za-z]/g, '')
  const upper = letters.replace(/[^A-Z]/g, '').length
  if (letters && upper / letters.length > 0.7) s = s.toLowerCase()
  const titleCase = p => p.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase())
  const parts = s.split(',').map(p => p.trim())
    .filter(p => p && !/^(nfs|ns as to .*|not further specified|upc:.*)$/i.test(p))
    // Brand names written in capitals inside a label ("GENERAL MILLS") read as "General Mills".
    .map(p => (p.length > 3 && p === p.toUpperCase() && /[A-Z]/.test(p) ? titleCase(p) : p))
  let out = ''
  for (const p of parts.slice(0, 3)) {
    const next = out ? `${out}, ${p}` : p
    if (next.length > 60) break
    out = next
  }
  if (!out) out = parts[0]?.slice(0, 60) || ''
  return out ? out[0].toUpperCase() + out.slice(1) : ''
}

const norm = s => String(s || '').toLowerCase()

function nameScore(name, query) {
  const n = norm(name), q = norm(query).trim()
  if (!q) return 0
  if (n === q) return 4
  if (n.startsWith(q)) return 3
  if (n.split(/[\s,()/-]+/).some(w => w.startsWith(q))) return 2
  if (n.includes(q)) return 1
  return 0
}

const stem = w => w.replace(/(es|s)$/, '')

// True when every word typed (two letters or more) starts a word in the name, allowing plurals:
// "goldfish crackers" is relevant to "Goldfish crackers, cheddar" but not to "Crackers, rice".
export function isRelevant(name, query) {
  const words = norm(name).split(/[^a-z0-9']+/).filter(Boolean).map(stem)
  const typed = norm(query).split(/[^a-z0-9']+/).filter(w => w.length >= 2).map(stem)
  return typed.length > 0 && typed.every(t => words.some(w => w.startsWith(t)))
}

// Raw USDA search results to at most `limit` suggestions: tidy names, no duplicates, relevant ones
// first, then the best name match, then the shorter (simpler) name.
export function pickResults(foods, query, limit = 8) {
  const byName = new Map()
  for (const food of foods || []) {
    const name = tidyUsdaName(food?.description)
    if (!name) continue
    const key = norm(name)
    if (byName.has(key)) continue
    byName.set(key, { name, group: mapCategoryToGroup(food.foodCategory), nutrition: extractNutrients(food), _score: nameScore(name, query) + (isRelevant(name, query) ? 10 : 0) })
  }
  return [...byName.values()]
    .sort((a, b) => b._score - a._score || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ _score, ...r }) => r) // eslint-disable-line no-unused-vars
}

// How many picked results actually match what was typed; fewer than three means "try branded too".
export function relevantCount(results, query) {
  return results.filter(r => isRelevant(r.name, query)).length
}

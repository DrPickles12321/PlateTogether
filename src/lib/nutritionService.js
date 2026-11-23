import { resolveFoodNutrition } from './foodNutrition'

export function energyDensityLabel(calories) {
  if (calories < 200) return 'low'
  if (calories <= 400) return 'moderate'
  return 'high'
}

export function computeAN_Flags(info) {
  const flags = []
  if (info.calcium_mg >= 200) flags.push('good calcium source')
  if (info.iron_mg >= 2) flags.push('iron rich')
  if (info.vitamin_d_mcg >= 1) flags.push('vitamin D source')
  if (info.calories >= 400) flags.push('high energy density')
  if (info.protein_g >= 15) flags.push('complete protein')
  if (info.fat_g >= 10) flags.push('contains healthy fats')
  if (info.fiber_g >= 5) flags.push('high fiber')
  return flags
}

// Nutrition for one logged food (the stored item: name, group, usdaNutrition,
// nutrition). Values come only from a manual entry or USDA. With neither, hasData
// is false and the numbers are 0 placeholders that callers must not display.
export function lookupNutrition(food) {
  const item = typeof food === 'string' ? { name: food } : (food || {})
  const r = resolveFoodNutrition(item)
  const result = {
    name: item.name || '',
    hasData: r.hasData,
    source: r.source,
    confidence: r.hasData ? r.source : 'not_found',
    calories: r.calories,
    protein_g: r.protein_g,
    carbs_g: r.carbs_g,
    fat_g: r.fat_g,
    fiber_g: r.fiber_g,
    calcium_mg: r.calcium_mg,
    iron_mg: r.iron_mg,
    vitamin_d_mcg: r.vitamin_d_mcg,
    energy_density: r.hasData ? energyDensityLabel(r.calories) : null,
    plate_zone: r.plate_zone,
  }
  result.an_relevant_flags = r.hasData ? computeAN_Flags(result) : []
  return result
}

// Accepts an array of food items (or plain names)
export function lookupMealNutrition(foods) {
  return foods.map(f => lookupNutrition(f))
}

// Accepts array of flat lookupNutrition results; returns flat aggregate
export function aggregateMealNutrition(allInfos) {
  const nutritionInfos = (allInfos || []).filter(n => n.hasData !== false)
  const unknownCount = (allInfos || []).length - nutritionInfos.length
  if (!nutritionInfos.length) return {
    unknownCount,
    calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0,
    calcium_mg: 0, iron_mg: 0, vitamin_d_mcg: 0,
    plateBalance: { grain_pct: 0, protein_pct: 0, produce_pct: 0, fat_pct: 0, dairy_pct: 0 },
    an_relevant_flags: [],
  }

  const sums = nutritionInfos.reduce((acc, n) => ({
    calories:      acc.calories      + (n.calories || 0),
    protein_g:     acc.protein_g     + (n.protein_g || 0),
    carbs_g:       acc.carbs_g       + (n.carbs_g || 0),
    fat_g:         acc.fat_g         + (n.fat_g || 0),
    fiber_g:       acc.fiber_g       + (n.fiber_g || 0),
    calcium_mg:    acc.calcium_mg    + (n.calcium_mg || 0),
    iron_mg:       acc.iron_mg       + (n.iron_mg || 0),
    vitamin_d_mcg: acc.vitamin_d_mcg + (n.vitamin_d_mcg || 0),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, calcium_mg: 0, iron_mg: 0, vitamin_d_mcg: 0 })

  const rounded = {
    calories:      Math.round(sums.calories),
    protein_g:     Math.round(sums.protein_g),
    carbs_g:       Math.round(sums.carbs_g),
    fat_g:         Math.round(sums.fat_g),
    fiber_g:       Math.round(sums.fiber_g),
    calcium_mg:    Math.round(sums.calcium_mg),
    iron_mg:       Math.round(sums.iron_mg * 10) / 10,
    vitamin_d_mcg: Math.round(sums.vitamin_d_mcg * 10) / 10,
  }

  // Plate zone percentages
  const zoneCounts = { grain: 0, protein: 0, produce: 0, fat: 0, dairy: 0, mixed: 0 }
  for (const n of nutritionInfos) {
    const z = n.plate_zone || 'mixed'
    if (z in zoneCounts) zoneCounts[z]++
    else zoneCounts.mixed++
  }
  const total = nutritionInfos.length
  const pct = z => Math.round((zoneCounts[z] / total) * 100)

  const an_relevant_flags = [...new Set(nutritionInfos.flatMap(n => n.an_relevant_flags || []))]

  return {
    unknownCount,
    ...rounded,
    plateBalance: { grain_pct: pct('grain'), protein_pct: pct('protein'), produce_pct: pct('produce'), fat_pct: pct('fat'), dairy_pct: pct('dairy') },
    an_relevant_flags,
  }
}

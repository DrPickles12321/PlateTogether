// Nutrition for one logged food. Only values a person entered or USDA returned are
// used; if there are none the result says so instead of guessing.
const KEYS = ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'calcium_mg', 'iron_mg', 'vitamin_d_mcg']

const hasValues = n => !!n && typeof n === 'object' && Number.isFinite(Number(n.calories))

// food: { nutrition?: manual entry, usdaNutrition?: from USDA, group?: USDA food group }
export function resolveFoodNutrition(food) {
  const manual = food?.nutrition
  const usda = food?.usdaNutrition
  const source = hasValues(manual) ? 'manual' : hasValues(usda) ? 'usda' : null
  const chosen = source === 'manual' ? manual : source === 'usda' ? usda : null

  const out = { hasData: !!source, source, plate_zone: food?.group || 'mixed' }
  for (const k of KEYS) out[k] = chosen && Number.isFinite(Number(chosen[k])) ? Number(chosen[k]) : 0
  return out
}

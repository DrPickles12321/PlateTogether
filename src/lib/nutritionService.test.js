import { describe, it, expect } from 'vitest'
import { lookupNutrition, aggregateMealNutrition, lookupMealNutrition } from './nutritionService'

const usda = { calories: 200, protein_g: 10, carbs_g: 30, fat_g: 5, fiber_g: 2 }

describe('lookupNutrition', () => {
  it('returns USDA values and an energy label when data exists', () => {
    const r = lookupNutrition({ name: 'Oats', usdaNutrition: usda })
    expect(r).toMatchObject({ hasData: true, source: 'usda', calories: 200, energy_density: 'moderate' })
  })
  it('returns no data, not a guess, for a food with no values', () => {
    const r = lookupNutrition({ name: 'Grandma\'s stew', category: 'challenge' })
    expect(r.hasData).toBe(false)
    expect(r.confidence).toBe('not_found')
    expect(r.energy_density).toBeNull()
    expect(r.an_relevant_flags).toEqual([])
  })
  it('does not look anything up by name alone', () => {
    expect(lookupNutrition('Banana').hasData).toBe(false)
    expect(lookupNutrition().hasData).toBe(false)
  })
})

describe('aggregateMealNutrition', () => {
  it('totals only foods with data and reports how many were left out', () => {
    const infos = lookupMealNutrition([{ name: 'Oats', usdaNutrition: usda }, { name: 'Mystery' }])
    const total = aggregateMealNutrition(infos)
    expect(total.calories).toBe(200)
    expect(total.unknownCount).toBe(1)
  })
  it('is empty, not invented, when nothing has data', () => {
    const total = aggregateMealNutrition(lookupMealNutrition([{ name: 'Mystery' }]))
    expect(total.calories).toBe(0)
    expect(total.unknownCount).toBe(1)
  })
})

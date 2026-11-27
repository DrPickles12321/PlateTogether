import { describe, it, expect } from 'vitest'
import { foodsNeedingNutrition, backfillPatch } from './nutritionBackfill'

const NOW = Date.parse('2026-11-27T12:00:00Z')

describe('foodsNeedingNutrition', () => {
  const foods = [
    { id: 'a', name: 'Pizza' },
    { id: 'b', name: 'Oatmeal', usdaNutrition: { calories: 150 } },
    { id: 'c', name: 'Grandma soup', nutrition: { calories: 200 } },
    { id: 'd', name: 'Mystery bake', usdaCheckedAt: '2026-11-20T00:00:00Z' },
    { id: 'e', name: 'Old check', usdaCheckedAt: '2026-10-01T00:00:00Z' },
  ]
  it('picks foods with no nutrition that have not been tried recently', () => {
    expect(foodsNeedingNutrition(foods, { now: NOW }).map(f => f.id)).toEqual(['a', 'e'])
  })
  it('never touches hand-entered nutrition and respects the limit', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `f${i}`, name: `Food ${i}` }))
    expect(foodsNeedingNutrition(many, { now: NOW, limit: 3 })).toHaveLength(3)
    expect(foodsNeedingNutrition([{ id: 'c', name: 'x', nutrition: {} }], { now: NOW })).toEqual([])
  })
})

describe('backfillPatch', () => {
  it('always records the date tried, plus what was found', () => {
    const at = new Date(NOW)
    expect(backfillPatch(null, at)).toEqual({ usdaCheckedAt: '2026-11-27T12:00:00.000Z' })
    expect(backfillPatch({ group: 'grain', nutrition: { calories: 285 } }, at))
      .toEqual({ usdaCheckedAt: '2026-11-27T12:00:00.000Z', group: 'grain', usdaNutrition: { calories: 285 } })
  })
})

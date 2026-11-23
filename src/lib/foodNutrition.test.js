import { describe, it, expect } from 'vitest'
import { resolveFoodNutrition } from './foodNutrition'

const usda = { calories: 120, protein_g: 4, carbs_g: 20, fat_g: 2, fiber_g: 3 }
const manual = { calories: 90, protein_g: 1, carbs_g: 15, fat_g: 1, fiber_g: 1 }

describe('resolveFoodNutrition', () => {
  it('prefers a manual entry over USDA', () => {
    const r = resolveFoodNutrition({ name: 'Oats', nutrition: manual, usdaNutrition: usda })
    expect(r).toMatchObject({ hasData: true, source: 'manual', calories: 90 })
  })
  it('uses USDA when nothing was entered', () => {
    expect(resolveFoodNutrition({ name: 'Oats', usdaNutrition: usda })).toMatchObject({ hasData: true, source: 'usda', calories: 120, protein_g: 4 })
  })
  it('never invents numbers for an unknown food', () => {
    const r = resolveFoodNutrition({ name: 'Grandma\'s stew' })
    expect(r.hasData).toBe(false)
    expect(r.source).toBeNull()
    expect(r.calories).toBe(0)
  })
  it('ignores empty or malformed nutrition objects', () => {
    expect(resolveFoodNutrition({ usdaNutrition: {} }).hasData).toBe(false)
    expect(resolveFoodNutrition({ nutrition: { calories: 'abc' } }).hasData).toBe(false)
    expect(resolveFoodNutrition(null).hasData).toBe(false)
  })
  it('keeps a real zero-calorie entry as data', () => {
    expect(resolveFoodNutrition({ nutrition: { calories: 0 } }).hasData).toBe(true)
  })
  it('carries the USDA food group', () => {
    expect(resolveFoodNutrition({ group: 'grain', usdaNutrition: usda }).plate_zone).toBe('grain')
    expect(resolveFoodNutrition({}).plate_zone).toBe('mixed')
  })
})

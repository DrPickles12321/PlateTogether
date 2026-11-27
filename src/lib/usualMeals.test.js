import { describe, it, expect } from 'vitest'
import { buildUsualMeal, usualMealsFor, suggestName, foodsToAdd, MAX_FOODS } from './usualMeals'

const oats = { id: 'a', name: 'Oatmeal', category: 'familiar', group: 'grain' }
const milk = { id: 'b', name: 'Milk', category: 'familiar' }
const pb = { id: 'c', name: 'Peanut butter', category: 'challenge' }
const NOW = '2026-11-26T08:00:00.000Z'

describe('buildUsualMeal', () => {
  it('keeps a tidy name and a small snapshot of each food', () => {
    const got = buildUsualMeal({ id: 'u1', name: '  School-day   breakfast ', mealType: 'breakfast', foods: [oats, milk], now: NOW })
    expect(got).toEqual({
      id: 'u1', name: 'School-day breakfast', mealType: 'breakfast', createdAt: NOW,
      foods: [{ id: 'a', name: 'Oatmeal', category: 'familiar' }, { id: 'b', name: 'Milk', category: 'familiar' }],
    })
  })
  it('refuses fewer than two foods, a missing name or a bad meal type', () => {
    expect(buildUsualMeal({ name: 'One', mealType: 'lunch', foods: [oats] })).toBeNull()
    expect(buildUsualMeal({ name: ' ', mealType: 'lunch', foods: [oats, milk] })).toBeNull()
    expect(buildUsualMeal({ name: 'X', mealType: 'brunch', foods: [oats, milk] })).toBeNull()
  })
  it('drops duplicates and caps the list', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `f${i}`, name: `Food ${i}` }))
    expect(buildUsualMeal({ name: 'Big', mealType: 'dinner', foods: [oats, oats, ...many] }).foods).toHaveLength(MAX_FOODS)
    expect(buildUsualMeal({ name: 'Dup', mealType: 'dinner', foods: [oats, oats, milk] }).foods).toHaveLength(2)
  })
})

describe('usualMealsFor', () => {
  it('returns this meal type only, newest first, skipping broken records', () => {
    const raw = {
      u1: { name: 'Old', mealType: 'breakfast', foods: [oats], createdAt: '2026-11-01' },
      u2: { name: 'New', mealType: 'breakfast', foods: [milk], createdAt: '2026-11-20' },
      u3: { name: 'Dinner', mealType: 'dinner', foods: [oats], createdAt: '2026-11-21' },
      u4: { name: 'Broken', mealType: 'breakfast' },
    }
    expect(usualMealsFor(raw, 'breakfast').map(m => m.name)).toEqual(['New', 'Old'])
    expect(usualMealsFor(null, 'breakfast')).toEqual([])
  })
})

describe('suggestName', () => {
  it('numbers the default name when it is taken', () => {
    expect(suggestName('Dinner', [])).toBe('Usual dinner')
    expect(suggestName('Dinner', [{ name: 'Usual dinner' }, { name: 'Usual dinner 2' }])).toBe('Usual dinner 3')
  })
})

describe('foodsToAdd', () => {
  const usual = { foods: [{ id: 'a', name: 'Oatmeal', category: 'familiar' }, { id: 'b', name: 'Milk' }, { id: 'gone', name: 'Toast' }] }
  it("uses the family's current food record and skips what is already in the meal", () => {
    const got = foodsToAdd(usual, { mealItems: [milk], foodItems: [oats, milk, pb] })
    expect(got).toEqual([oats, { id: 'gone', name: 'Toast' }])
  })
  it('matches by name when the id changed', () => {
    const renamed = { id: 'z', name: 'oatmeal', category: 'working_on' }
    expect(foodsToAdd({ foods: [{ id: 'a', name: 'Oatmeal' }] }, { foodItems: [renamed] })).toEqual([renamed])
  })
})

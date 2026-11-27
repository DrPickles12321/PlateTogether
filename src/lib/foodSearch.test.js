import { describe, it, expect } from 'vitest'
import { foodUsage, usualFoods, matchScore, searchFamilyFoods, canAddAsNew, newFoodSuggestions, tidyName, showNewFoods } from './foodSearch'

describe('tidyName', () => {
  it('trims, collapses spaces and capitalises the first letter only', () => {
    expect(tidyName('  garlic   bread ')).toBe('Garlic bread')
    expect(tidyName('BLT')).toBe('BLT')
    expect(tidyName('')).toBe('')
  })
})

const oats = { id: 'a', name: 'Oatmeal', category: 'familiar' }
const toast = { id: 'b', name: 'Toast with butter', category: 'familiar' }
const yogurt = { id: 'c', name: 'Yogurt', category: 'working_on' }
const pasta = { id: 'd', name: 'Pasta with sauce', category: 'working_on' }
const pizza = { id: 'e', name: 'Pizza', category: 'challenge' }
const foods = [oats, toast, yogurt, pasta, pizza]

const log = {
  '2026-11-20': { breakfast: [oats, yogurt], dinner: [pasta] },
  '2026-11-23': { breakfast: [oats], dinner: [pizza] },
  '2026-11-24': { breakfast: [toast, oats], snack: [yogurt] },
  '2026-11-25': { breakfast: [yogurt], dinner: [pasta] },
  '2026-11-26': { breakfast: [toast] }, // today: not counted
  '2026-10-01': { breakfast: [pizza] }, // too old: not counted
}
const base = { foods, allMealItems: log, date: '2026-11-26' }

describe('foodUsage', () => {
  it('counts this meal and any meal, only in the window before the date', () => {
    const u = foodUsage(log, { date: '2026-11-26', mealType: 'breakfast' })
    expect(u.get('a')).toEqual({ atMeal: 3, any: 3, last: '2026-11-24' })
    expect(u.get('c')).toEqual({ atMeal: 2, any: 3, last: '2026-11-25' })
    expect(u.get('e')).toEqual({ atMeal: 0, any: 1, last: '2026-11-23' })
  })
})

describe('usualFoods', () => {
  it('lists foods served at this meal, most often first', () => {
    expect(usualFoods({ ...base, mealType: 'breakfast' }).map(f => f.name)).toEqual(['Oatmeal', 'Yogurt', 'Toast with butter'])
    expect(usualFoods({ ...base, mealType: 'dinner' }).map(f => f.name)).toEqual(['Pasta with sauce', 'Pizza'])
  })
  it('is empty for a meal with no history', () => {
    expect(usualFoods({ ...base, mealType: 'lunch' })).toEqual([])
  })
})

describe('matchScore', () => {
  it('ranks exact, then starts-with, then word starts-with, then contains', () => {
    expect(matchScore('Pizza', 'pizza')).toBe(4)
    expect(matchScore('Pasta with sauce', 'pas')).toBe(3)
    expect(matchScore('Pasta with sauce', 'sau')).toBe(2)
    expect(matchScore('Oatmeal', 'meal')).toBe(1)
    expect(matchScore('Oatmeal', 'rice')).toBe(0)
  })
  it('does not match the middle of a word on two letters', () => {
    expect(matchScore('Turkey sandwich', 'ch')).toBe(0)
    expect(matchScore('Turkey sandwich', 'wic')).toBe(1)
  })
})

describe('showNewFoods', () => {
  it('waits for three letters when the family already has matches', () => {
    expect(showNewFoods('ch', 2)).toBe(false)
    expect(showNewFoods('che', 2)).toBe(true)
    expect(showNewFoods('zu', 0)).toBe(true)
    expect(showNewFoods('z', 0)).toBe(false)
  })
})

describe('searchFamilyFoods', () => {
  it('puts the best name match first, then what is usual at this meal', () => {
    const got = searchFamilyFoods({ ...base, mealType: 'dinner', query: 'p' }).map(f => f.name)
    expect(got).toEqual(['Pasta with sauce', 'Pizza'])
  })
  it('finds a word inside the name', () => {
    expect(searchFamilyFoods({ ...base, mealType: 'breakfast', query: 'butter' }).map(f => f.name)).toEqual(['Toast with butter'])
  })
  it('does not pull in unrelated foods on a short query', () => {
    const many = [...foods, { id: 'f', name: 'Cheese and crackers' }, { id: 'g', name: 'Ice cream' }, { id: 'h', name: 'Apple slices' }]
    expect(searchFamilyFoods({ ...base, foods: many, mealType: 'dinner', query: 'che' }).map(f => f.name)).toEqual(['Cheese and crackers'])
  })
  it('forgives a small typo', () => {
    expect(searchFamilyFoods({ ...base, mealType: 'snack', query: 'yoghurt' }).map(f => f.name)).toEqual(['Yogurt'])
  })
  it('returns nothing for an empty query', () => {
    expect(searchFamilyFoods({ ...base, mealType: 'snack', query: '  ' })).toEqual([])
  })
})

describe('canAddAsNew', () => {
  it('needs two letters and a name the family does not have', () => {
    expect(canAddAsNew('g', foods)).toBe(false)
    expect(canAddAsNew('Garlic bread', foods)).toBe(true)
    expect(canAddAsNew(' pizza ', foods)).toBe(false)
  })
})

describe('newFoodSuggestions', () => {
  it('dedupes USDA results and skips what the family already has', () => {
    const usda = [{ name: 'Garlic bread' }, { name: 'Garlic Bread' }, { name: 'Garlic, raw' }, { name: 'Pizza' }]
    const got = newFoodSuggestions({ query: 'gar', usda, existingNames: ['Pizza'] }).map(f => f.name)
    expect(got).toEqual(['Garlic bread', 'Garlic, raw'])
  })
  it('leaves out the exact text typed, which has its own "add" row', () => {
    expect(newFoodSuggestions({ query: 'bagel', usda: [{ name: 'Bagel' }, { name: 'Bagel, plain' }] }).map(f => f.name)).toEqual(['Bagel, plain'])
  })
  it('waits for two letters and caps the list', () => {
    expect(newFoodSuggestions({ query: 'g', usda: [{ name: 'Granola' }] })).toEqual([])
    const many = Array.from({ length: 10 }, (_, i) => ({ name: `Granola ${i}` }))
    expect(newFoodSuggestions({ query: 'gra', usda: many })).toHaveLength(6)
  })
})

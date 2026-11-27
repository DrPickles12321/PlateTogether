import { describe, it, expect } from 'vitest'
import { STARTER_FOODS, ALL_STARTER_FOODS, starterIdeas } from './starterFoods'

describe('starter foods', () => {
  it('has a handful of ideas for every meal', () => {
    for (const meal of ['breakfast', 'lunch', 'snack', 'dinner']) {
      expect(STARTER_FOODS[meal].length).toBeGreaterThanOrEqual(6)
    }
  })
  it('carries no "safe" or "challenge" style labels, only food names', () => {
    for (const name of ALL_STARTER_FOODS) {
      expect(typeof name).toBe('string')
      expect(name).not.toMatch(/safe|plain|challenge|low[- ]?fat|diet|light/i)
    }
  })
  it('leaves out foods the family already has, ignoring case', () => {
    expect(starterIdeas('breakfast', ['toast', 'Yogurt'])).not.toContain('Toast')
    expect(starterIdeas('breakfast', ['toast', 'Yogurt'])).not.toContain('Yogurt')
    expect(starterIdeas('brunch')).toEqual([])
  })
})

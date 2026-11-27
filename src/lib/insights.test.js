import { describe, it, expect } from 'vitest'
import { computeInsightsFromMealItems } from './insights'

const dates = ['2026-11-23', '2026-11-24']

describe('computeInsightsFromMealItems', () => {
  it('does not count foods with no type under any type', () => {
    const items = { '2026-11-23': { dinner: [{ name: 'Toast' }, { name: 'Rice' }] } }
    const statuses = { '2026-11-23': { dinner: 'refused' } }
    const got = computeInsightsFromMealItems(items, statuses, dates)
    expect(got.refused).toBe(1)
    expect(got.topRefusedCategory).toBeNull()
  })

  it('still counts typed foods in a refused meal', () => {
    const items = { '2026-11-24': { dinner: [{ name: 'Pizza', category: 'challenge' }, { name: 'Toast' }] } }
    const statuses = { '2026-11-24': { dinner: 'refused' } }
    expect(computeInsightsFromMealItems(items, statuses, dates).topRefusedCategory).toEqual({ category: 'challenge', count: 1 })
  })
})

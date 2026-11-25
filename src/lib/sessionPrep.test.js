import { describe, it, expect } from 'vitest'
import { buildSessionPrep } from './sessionPrep'

const week = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']
const prev = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']

describe('buildSessionPrep', () => {
  it('handles an empty week without inventing findings', () => {
    const r = buildSessionPrep({ isoDates: week })
    expect(r.logged).toBe(0)
    expect(r.totalSlots).toBe(28)
    expect(r.notLoggedDays).toHaveLength(7)
    expect(r.hardestMeal).toBeNull()
    expect(r.hardEntries).toEqual([])
    expect(r.distress.change).toBeNull()
  })

  it('counts statuses and lists each hard entry as evidence', () => {
    const r = buildSessionPrep({
      isoDates: week,
      mealStatuses: {
        '2026-11-16': { breakfast: 'okay', dinner: 'refused' },
        '2026-11-17': { dinner: 'difficult', lunch: 'skipped' },
      },
    })
    expect(r.counts).toEqual({ okay: 1, difficult: 1, refused: 1, skipped: 1 })
    expect(r.logged).toBe(4)
    expect(r.hardEntries).toEqual([
      { date: '2026-11-16', meal: 'dinner', mealLabel: 'Dinner', status: 'refused' },
      { date: '2026-11-17', meal: 'dinner', mealLabel: 'Dinner', status: 'difficult' },
    ])
    expect(r.hardestMeal).toEqual({ meal: 'dinner', label: 'Dinner', count: 2 })
    expect(r.notLoggedDays).toHaveLength(5)
  })

  it('does not name a hardest meal on a tie', () => {
    const r = buildSessionPrep({
      isoDates: week,
      mealStatuses: { '2026-11-16': { lunch: 'refused', dinner: 'refused' } },
    })
    expect(r.hardestMeal).toBeNull()
  })

  it('lists challenge foods with the status of the meal they were in', () => {
    const r = buildSessionPrep({
      isoDates: week,
      mealStatuses: { '2026-11-18': { snack: 'okay' } },
      allMealItems: { '2026-11-18': { snack: [{ name: 'Granola bar', category: 'challenge' }, { name: 'Apple', category: 'familiar' }] } },
    })
    expect(r.challengeAttempts).toEqual([
      { date: '2026-11-18', meal: 'snack', mealLabel: 'Snack', name: 'Granola bar', status: 'okay' },
    ])
  })

  it('compares post-meal distress with the previous week only when both have ratings', () => {
    const both = buildSessionPrep({
      isoDates: week,
      previousIsoDates: prev,
      mealDistress: {
        '2026-11-16': { dinner: { pre: 4, post: 3 } },
        '2026-11-17': { dinner: { post: 4 } },
        '2026-11-10': { dinner: { post: 5 } },
      },
    })
    expect(both.distress).toEqual({ avgPost: 3.5, previousAvgPost: 5, change: -1.5 })

    const onlyThis = buildSessionPrep({ isoDates: week, previousIsoDates: prev, mealDistress: { '2026-11-16': { dinner: { post: 2 } } } })
    expect(onlyThis.distress.change).toBeNull()
  })
})

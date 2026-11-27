import { describe, it, expect } from 'vitest'
import { buildSessionSummary } from './sessionSummary'

const week = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']

describe('buildSessionSummary', () => {
  const summary = buildSessionSummary({
    isoDates: week,
    today: '2026-11-27',
    mealStatuses: { '2026-11-23': { breakfast: 'okay', dinner: 'refused' }, '2026-11-24': { lunch: 'difficult' } },
    mealDistress: { '2026-11-23': { dinner: { pre: 4, post: 3 } } },
    allMealItems: { '2026-11-23': { dinner: [{ name: 'Pizza', category: 'challenge' }, { name: 'Milk', category: 'familiar' }] } },
    parentNotes: [
      { date: '2026-11-25', body: 'A hard day.' },
      { date: '2026-11-16', body: 'Last week.' },
      { date: '2026-11-24', body: '' },
    ],
  })

  it('lays out every day and meal, with foods and distress', () => {
    expect(summary.days).toHaveLength(7)
    const mon = summary.days[0]
    expect(mon.meals.dinner).toEqual({ status: 'refused', foods: ['Pizza', 'Milk'], distress: { pre: 4, post: 3 } })
    expect(mon.meals.lunch).toEqual({ status: null, foods: [], distress: null })
  })

  it('marks days after today as not yet happened', () => {
    expect(summary.days.map(d => d.future)).toEqual([false, false, false, false, false, true, true])
  })

  it('keeps only this week’s parent notes that have text, oldest first', () => {
    expect(summary.notes).toEqual([{ date: '2026-11-25', body: 'A hard day.' }])
  })

  it('carries the session prep facts', () => {
    expect(summary.prep.counts).toEqual({ okay: 1, difficult: 1, refused: 1, skipped: 0 })
    expect(summary.prep.challengeAttempts.map(a => a.name)).toEqual(['Pizza'])
  })
})

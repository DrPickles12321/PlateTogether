import { describe, it, expect } from 'vitest'
import { buildSessionSummary, datesSince, datesBefore, sessionAgo } from './sessionSummary'

describe('since the last session', () => {
  it('lists the days after the session up to today', () => {
    expect(datesSince('2026-11-24', '2026-11-27')).toEqual(['2026-11-25', '2026-11-26', '2026-11-27'])
    expect(datesSince('2026-11-30', '2026-12-02')).toEqual(['2026-12-01', '2026-12-02'])
  })

  it('is empty when the session was today, or never', () => {
    expect(datesSince('2026-11-27', '2026-11-27')).toEqual([])
    expect(datesSince(null, '2026-11-27')).toEqual([])
  })

  it('caps a long gap', () => {
    const dates = datesSince('2026-01-01', '2026-11-27', 28)
    expect(dates).toHaveLength(28)
    expect(dates[27]).toBe('2026-11-27')
  })

  it('gives the window just before, for comparisons', () => {
    expect(datesBefore(['2026-11-25', '2026-11-26'])).toEqual(['2026-11-23', '2026-11-24'])
  })

  it('says how long ago in words', () => {
    expect(sessionAgo('2026-11-27', '2026-11-27')).toBe('today')
    expect(sessionAgo('2026-11-26', '2026-11-27')).toBe('yesterday')
    expect(sessionAgo('2026-11-20', '2026-11-27')).toBe('7 days ago')
    expect(sessionAgo(null, '2026-11-27')).toBeNull()
  })
})

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

  it('keeps only this week’s parent notes that have text, oldest first', () => {
    expect(summary.notes).toEqual([{ date: '2026-11-25', body: 'A hard day.' }])
  })

  it('carries the session prep facts', () => {
    expect(summary.prep.counts).toEqual({ okay: 1, difficult: 1, refused: 1, skipped: 0 })
    expect(summary.prep.challengeAttempts.map(a => a.name)).toEqual(['Pizza'])
  })
})

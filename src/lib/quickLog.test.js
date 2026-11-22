import { describe, it, expect } from 'vitest'
import { quickLogPatch, shiftIsoDate, sameAsYesterday, recentFoods, STATUS_TO_OUTCOME } from './quickLog'

describe('quickLogPatch', () => {
  it('maps outcomes onto existing statuses', () => {
    expect(quickLogPatch({ outcome: 'finished' })).toEqual({ status: 'okay' })
    expect(quickLogPatch({ outcome: 'partly' })).toEqual({ status: 'difficult' })
    expect(quickLogPatch({ outcome: 'refused' })).toEqual({ status: 'refused' })
  })
  it('stores difficulty as the post-meal distress rating', () => {
    expect(quickLogPatch({ difficulty: 4 })).toEqual({ 'distress/post': 4 })
  })
  it('writes both when both are given and nothing when neither is', () => {
    expect(quickLogPatch({ outcome: 'finished', difficulty: 1 })).toEqual({ status: 'okay', 'distress/post': 1 })
    expect(quickLogPatch({})).toEqual({})
  })
  it('rejects values outside the scale', () => {
    expect(() => quickLogPatch({ outcome: 'ate-lots' })).toThrow()
    expect(() => quickLogPatch({ difficulty: 6 })).toThrow()
    expect(() => quickLogPatch({ difficulty: 0 })).toThrow()
  })
  it('round-trips statuses back to outcomes', () => {
    expect(STATUS_TO_OUTCOME.difficult).toBe('partly')
  })
})

describe('shiftIsoDate', () => {
  it('crosses month and year boundaries', () => {
    expect(shiftIsoDate('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftIsoDate('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftIsoDate('2026-03-08', -1)).toBe('2026-03-07')
  })
})

const oats = { id: 'a', name: 'Oats', category: 'familiar', status: 'okay', portion: 0.5 }
const toast = { id: 'b', name: 'Toast', category: 'familiar' }
const eggs = { id: 'c', name: 'Eggs', category: 'working_on' }

describe('sameAsYesterday', () => {
  const data = { '2026-05-09': { breakfast: [oats, toast], dinner: [eggs] } }
  it('copies yesterday\'s meal without status or portion', () => {
    const got = sameAsYesterday(data, '2026-05-10', 'breakfast')
    expect(got.map(f => f.name)).toEqual(['Oats', 'Toast'])
    expect(got[0]).not.toHaveProperty('status')
    expect(got[0]).not.toHaveProperty('portion')
    expect(got[0].id).toBe('a')
  })
  it('is empty when yesterday has nothing for that meal', () => {
    expect(sameAsYesterday(data, '2026-05-10', 'lunch')).toEqual([])
    expect(sameAsYesterday(data, '2026-05-20', 'breakfast')).toEqual([])
    expect(sameAsYesterday(undefined, '2026-05-10', 'breakfast')).toEqual([])
  })
})

describe('recentFoods', () => {
  const data = {
    '2026-05-08': { breakfast: [oats], dinner: [eggs] },
    '2026-05-09': { breakfast: [oats, toast], dinner: [eggs] },
    '2026-05-10': { breakfast: [toast] },           // today: ignored
    '2026-04-01': { breakfast: [{ id: 'z', name: 'Old' }] }, // outside window
  }
  it('ranks same-meal foods first, then by frequency, and ignores today and old days', () => {
    const got = recentFoods(data, { date: '2026-05-10', mealType: 'breakfast' })
    expect(got.map(f => f.name)).toEqual(['Oats', 'Toast', 'Eggs'])
  })
  it('leaves out foods already in the meal and respects the limit', () => {
    expect(recentFoods(data, { date: '2026-05-10', mealType: 'breakfast', exclude: [{ id: 'a' }] }).map(f => f.name)).toEqual(['Toast', 'Eggs'])
    expect(recentFoods(data, { date: '2026-05-10', mealType: 'breakfast', limit: 1 })).toHaveLength(1)
  })
  it('strips per-day status and portion', () => {
    expect(recentFoods(data, { date: '2026-05-10', mealType: 'breakfast' })[0]).not.toHaveProperty('status')
  })
  it('returns nothing when there is no history', () => {
    expect(recentFoods({}, { date: '2026-05-10', mealType: 'breakfast' })).toEqual([])
  })
})

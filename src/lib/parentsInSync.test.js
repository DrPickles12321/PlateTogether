import { describe, it, expect } from 'vitest'
import { parentsInSync, lastDays } from './parentsInSync'

const caregivers = [
  { uid: 'p1', label: 'alex', household: 'main' },
  { uid: 'p2', label: 'sam', household: 'second' },
]
const days = ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23']

describe('parents in sync', () => {
  it('counts logged and hard meals per caregiver and per home, ignoring skipped meals', () => {
    const mealStatuses = {
      '2026-11-20': { breakfast: 'okay', dinner: 'refused' },
      '2026-11-21': { breakfast: 'okay', dinner: 'difficult', lunch: 'skipped' },
      '2026-11-22': { breakfast: 'okay', dinner: 'refused' },
      '2026-11-23': { breakfast: 'okay', dinner: 'okay' },
    }
    const mealLoggedBy = {
      '2026-11-20': { breakfast: 'p1', dinner: 'p2' },
      '2026-11-21': { breakfast: 'p1', dinner: 'p2', lunch: 'p1' },
      '2026-11-22': { breakfast: 'p1', dinner: 'p2' },
      '2026-11-23': { breakfast: 'p1', dinner: 'p2' },
    }
    const r = parentsInSync({ mealStatuses, mealLoggedBy, caregivers, isoDates: days })
    expect(r.total).toBe(8)
    expect(r.caregiverRows).toEqual([
      { uid: 'p1', name: 'alex', household: 'main', logged: 4, hard: 0 },
      { uid: 'p2', name: 'sam', household: 'second', logged: 4, hard: 3 },
    ])
    expect(r.byHome).toEqual([{ home: 'main', label: 'Home 1', logged: 4 }, { home: 'second', label: 'Home 2', logged: 4 }])
    expect(r.notes).toEqual([
      'Meals sam logged were hard more often: 3 of 4, against 0 of 4 for alex.',
      'Breakfast was logged only by alex (4 times).',
      'Dinner was logged only by sam (4 times).',
    ])
  })

  it('notes a caregiver who logged nothing, and says nothing for a single caregiver', () => {
    const mealStatuses = { '2026-11-20': { lunch: 'okay' } }
    const mealLoggedBy = { '2026-11-20': { lunch: 'p1' } }
    expect(parentsInSync({ mealStatuses, mealLoggedBy, caregivers, isoDates: days }).notes).toEqual(['sam logged no meals in these two weeks.'])
    expect(parentsInSync({ mealStatuses, mealLoggedBy, caregivers: caregivers.slice(0, 1), isoDates: days }).notes).toEqual([])
  })

  it('never judges a parent', () => {
    const text = JSON.stringify(parentsInSync({ mealStatuses: {}, mealLoggedBy: {}, caregivers, isoDates: days }))
    expect(text).not.toMatch(/better|worse|fault|should|blame/i)
    expect(lastDays(3, new Date(2026, 10, 28))).toEqual(['2026-11-26', '2026-11-27', '2026-11-28'])
  })
})

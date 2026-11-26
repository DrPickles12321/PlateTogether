import { describe, it, expect } from 'vitest'
import { pickNextMeal, shortTime, loggedCount } from './nextMeal'
import { normalizeCarePlan, linesFromText, hasPlan, MAX_LINES } from './carePlan'

describe('pickNextMeal', () => {
  it('starts the day with breakfast', () => {
    expect(pickNextMeal({}).key).toBe('breakfast')
  })

  it('skips meals that already have an outcome', () => {
    expect(pickNextMeal({ statuses: { breakfast: 'okay', lunch: 'refused' } }).key).toBe('snack')
  })

  it("follows the family's own meal times", () => {
    const times = { breakfast: '07:30', lunch: '12:15', snack: '20:00', dinner: '18:30' }
    expect(pickNextMeal({ statuses: { breakfast: 'okay', lunch: 'okay' }, times })).toMatchObject({ key: 'dinner', time: '18:30' })
  })

  it('returns nothing once every meal is logged', () => {
    expect(pickNextMeal({ statuses: { breakfast: 'okay', lunch: 'okay', snack: 'skipped', dinner: 'difficult' } })).toBeNull()
  })

  it('counts logged meals', () => {
    expect(loggedCount({ breakfast: 'okay', dinner: 'refused' })).toBe(2)
  })
})

describe('shortTime', () => {
  it('drops AM and PM', () => {
    expect(shortTime('18:30')).toBe('6:30')
    expect(shortTime('08:05')).toBe('8:05')
    expect(shortTime('12:00')).toBe('12:00')
    expect(shortTime('bad')).toBe('')
  })
})

describe('care plan', () => {
  it('cleans what is stored and keeps it short', () => {
    const plan = normalizeCarePlan({ tableReminders: ['  Sit together ', '', 42], refusalSteps: { 0: 'Stay calm' } })
    expect(plan.tableReminders).toEqual(['Sit together'])
    expect(plan.refusalSteps).toEqual(['Stay calm'])
  })

  it('treats a missing plan as empty, never as made-up advice', () => {
    const plan = normalizeCarePlan(null)
    expect(plan).toEqual({ tableReminders: [], refusalSteps: [], updatedAt: null })
    expect(hasPlan(plan)).toBe(false)
  })

  it("turns a clinician's text box into lines", () => {
    expect(linesFromText('One\n\n Two \n')).toEqual(['One', 'Two'])
    expect(linesFromText(Array.from({ length: 10 }, (_, i) => `L${i}`).join('\n'))).toHaveLength(MAX_LINES)
  })
})

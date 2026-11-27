import { describe, it, expect } from 'vitest'
import { weekHighlights } from './weekHighlights'

// 2026-11-23 is a Monday.
const dates = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']

describe('weekHighlights', () => {
  it('says nothing is written down when the week is empty', () => {
    const out = weekHighlights({ mealStatuses: {}, dates, today: '2026-11-26' })
    expect(out).toHaveLength(1)
    expect(out[0].text).toMatch(/Nothing written down yet/)
  })

  it('names the days a meal was refused, first', () => {
    const mealStatuses = {
      '2026-11-23': { breakfast: 'okay', snack: 'okay' },
      '2026-11-24': { breakfast: 'okay', snack: 'skipped' },
      '2026-11-25': { breakfast: 'okay', snack: 'refused' },
      '2026-11-26': { breakfast: 'okay', dinner: 'refused' },
    }
    const out = weekHighlights({ mealStatuses, dates, today: '2026-11-26' })
    expect(out[0]).toEqual({ topic: 'Snacks', text: 'Hard on Wednesday. Worth raising at your next session.' })
    expect(out[1].topic).toBe('Dinners')
    expect(out[2]).toEqual({ topic: 'Breakfasts', text: 'Steady so far this week.' })
  })

  it('joins several days in plain English', () => {
    const mealStatuses = {
      '2026-11-23': { lunch: 'refused' },
      '2026-11-24': { lunch: 'refused' },
      '2026-11-25': { lunch: 'refused' },
    }
    expect(weekHighlights({ mealStatuses, dates, today: '2026-11-26' })[0].text)
      .toBe('Hard on Monday, Tuesday and Wednesday. Worth raising at your next session.')
  })

  it('never counts or scores, and ignores days after today', () => {
    const mealStatuses = { '2026-11-28': { dinner: 'refused' }, '2026-11-23': { dinner: 'okay' } }
    expect(weekHighlights({ mealStatuses, dates, today: '2026-11-26' })).toEqual([])
    for (const h of weekHighlights({ mealStatuses: { '2026-11-23': { lunch: 'refused' } }, dates, today: '2026-11-26' })) {
      expect(h.text).not.toMatch(/\d|%|great|well done/i)
    }
  })

  it('does not call a meal steady with fewer than three entries or any partial', () => {
    const mealStatuses = {
      '2026-11-23': { breakfast: 'okay', lunch: 'okay' },
      '2026-11-24': { breakfast: 'okay', lunch: 'difficult' },
      '2026-11-25': { lunch: 'okay' },
    }
    expect(weekHighlights({ mealStatuses, dates, today: '2026-11-26' })).toEqual([])
  })
})

import { describe, it, expect } from 'vitest'
import { familySummary, sortFamilies } from './familyTriage'

// 2026-11-23 is a Monday; "today" is Thursday the 26th.
const weekDates = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']
const today = '2026-11-26'
const base = { weekDates, today }

describe('familySummary', () => {
  it('puts a request for support first', () => {
    const s = familySummary({ ...base, sosOpen: true, mealLogs: { '2026-11-26': { lunch: { status: 'okay' } } } })
    expect(s.priority).toBe(3)
    expect(s.reason).toBe('Asked for support')
  })

  it('counts meals not eaten and unread notes this week', () => {
    const s = familySummary({
      ...base,
      mealLogs: {
        '2026-11-24': { dinner: { status: 'refused' }, lunch: { status: 'difficult' } },
        '2026-11-26': { snack: { status: 'refused' } },
      },
      parentNotes: { '2026-11-25': { body: 'Hard night', read_at: null }, '2026-11-20': { body: 'Old', read_at: 'x' } },
    })
    expect(s).toMatchObject({ refused: 2, partly: 1, unread: 1, priority: 2 })
    expect(s.reasons).toEqual(['2 meals not eaten this week', '1 unread note'])
  })

  it('notices when nothing has been logged for a couple of days', () => {
    const s = familySummary({ ...base, mealLogs: { '2026-11-23': { lunch: { status: 'okay' } } } })
    expect(s.priority).toBe(1)
    expect(s.reason).toBe('Nothing logged since Mon')
  })

  it('calls an ordinary week steady, and ignores days after today', () => {
    const logs = { '2026-11-25': { lunch: { status: 'okay' } }, '2026-11-26': { lunch: { status: 'okay' } }, '2026-11-28': { lunch: { status: 'refused' } } }
    const s = familySummary({ ...base, mealLogs: logs })
    expect(s).toMatchObject({ priority: 0, refused: 0, reason: 'A steady week' })
  })
})

describe('sortFamilies', () => {
  it('orders by priority, then meals not eaten, then name', () => {
    const fam = (name, priority, refused = 0) => ({ name, summary: { priority, refused } })
    const out = sortFamilies([fam('Zed', 0), fam('Amy', 2, 1), fam('Bea', 2, 3), fam('Cal', 3)])
    expect(out.map(f => f.name)).toEqual(['Cal', 'Bea', 'Amy', 'Zed'])
  })
})

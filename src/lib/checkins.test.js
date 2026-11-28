import { describe, it, expect } from 'vitest'
import { isoWeek, weekStart, checkinId, needsSupportNow, strainByCaregiver, strainWord, supportWord } from './checkins'

describe('weeks', () => {
  it('names ISO weeks the way the rules expect', () => {
    expect(isoWeek(new Date(2026, 10, 28))).toBe('2026-W48') // Sat Nov 28
    expect(isoWeek(new Date(2026, 10, 23))).toBe('2026-W48') // Mon Nov 23
    expect(isoWeek(new Date(2026, 10, 30))).toBe('2026-W49')
    expect(isoWeek(new Date(2027, 0, 1))).toBe('2026-W53') // Fri Jan 1 2027 belongs to 2026's last week
    expect(isoWeek(new Date(2026, 0, 1))).toBe('2026-W01')
    expect(weekStart('2026-W48')).toBe('2026-11-23')
    expect(checkinId('p1', '2026-W48')).toMatch(/^p1_[0-9]{4}-W[0-9]{2}$/)
  })
})

describe('answers', () => {
  it('words both scales, hardest and most supported at 5', () => {
    expect(strainWord(5)).toBe('Very hard')
    expect(supportWord(1)).toBe('Not at all')
  })

  it('offers help now for very hard, or hard with little support', () => {
    expect(needsSupportNow({ strain: 5, support: 5 })).toBe(true)
    expect(needsSupportNow({ strain: 4, support: 2 })).toBe(true)
    expect(needsSupportNow({ strain: 4, support: 4 })).toBe(false)
    expect(needsSupportNow({ strain: 2, support: 1 })).toBe(false)
  })

  it('groups by caregiver, newest first, and marks two hard weeks in a row', () => {
    const list = [
      { by: 'p1', week: '2026-W46', strain: 2, support: 4 },
      { by: 'p1', week: '2026-W48', strain: 4, support: 3 },
      { by: 'p1', week: '2026-W47', strain: 5, support: 2 },
      { by: 'p2', week: '2026-W48', strain: 4, support: 4 },
    ]
    const out = strainByCaregiver(list)
    expect(out.find(r => r.uid === 'p1')).toMatchObject({ hardTwoWeeks: true })
    expect(out.find(r => r.uid === 'p1').recent.map(c => c.week)).toEqual(['2026-W48', '2026-W47', '2026-W46'])
    expect(out.find(r => r.uid === 'p2').hardTwoWeeks).toBe(false)
  })
})

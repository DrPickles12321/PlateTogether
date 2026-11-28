import { describe, it, expect } from 'vitest'
import { activeTagIn, otherCaregivers, TAG_IN_MINUTES } from './tagIn'

const NOW = Date.parse('2026-11-28T18:30:00Z')
const MIN = 60000
const hm = (ref, meal, tagIns) => ({ ref, meal, date: '2026-11-28', tagIns })

describe('tag-in', () => {
  it('shows the newest recent ask from someone else', () => {
    const list = [
      hm('a', 'lunch', [{ by: 'p2', at: NOW - 20 * MIN }]),
      hm('b', 'dinner', [{ by: 'p2', at: NOW - 2 * MIN }]),
      hm('c', 'snack', [{ by: 'p1', at: NOW - MIN }]),
    ]
    expect(activeTagIn(list, { uid: 'p1', nowMs: NOW })).toEqual({ ref: 'b', meal: 'dinner', date: '2026-11-28', by: 'p2', at: NOW - 2 * MIN })
  })

  it('ignores old, dismissed, own and undated asks', () => {
    expect(activeTagIn([hm('a', 'dinner', [{ by: 'p2', at: NOW - (TAG_IN_MINUTES + 1) * MIN }])], { uid: 'p1', nowMs: NOW })).toBeNull()
    expect(activeTagIn([hm('a', 'dinner', [{ by: 'p2', at: NOW - MIN }])], { uid: 'p1', nowMs: NOW, dismissed: ['a'] })).toBeNull()
    expect(activeTagIn([hm('a', 'dinner', [{ by: 'p1', at: NOW - MIN }])], { uid: 'p1', nowMs: NOW })).toBeNull()
    expect(activeTagIn([hm('a', 'dinner', [{ by: 'p2', at: null }])], { uid: 'p1', nowMs: NOW })).toBeNull()
    expect(activeTagIn(undefined, { uid: 'p1' })).toBeNull()
  })

  it('lists the other caregivers', () => {
    expect(otherCaregivers([{ uid: 'p1', isYou: true }, { uid: 'p2', isYou: false }])).toEqual([{ uid: 'p2', isYou: false }])
  })
})

import { describe, it, expect } from 'vitest'
import { newInviteCode, isInviteCode, inviteExpiry, inviteLink, inviteState, openInvites, INVITE_DAYS } from './invites'

const NOW = Date.parse('2026-11-28T12:00:00Z')
const DAY = 86400000

describe('invites', () => {
  it('makes 10-character codes from an unambiguous alphabet', () => {
    const code = newInviteCode(n => Uint8Array.from({ length: n }, (_, i) => i * 7))
    expect(code).toHaveLength(10)
    expect(isInviteCode(code)).toBe(true)
    expect(code).not.toMatch(/[01OIL]/)
    expect(isInviteCode(newInviteCode())).toBe(true)
    expect(isInviteCode('../x')).toBe(false)
  })

  it('lasts a week and links to the join page', () => {
    expect(inviteExpiry(NOW) - NOW).toBe(INVITE_DAYS * DAY)
    expect(inviteLink('ABCDEFGHJK', 'https://app.example')).toBe('https://app.example/parent/join/ABCDEFGHJK')
  })

  it('says what the join screen should show', () => {
    const inv = { familyId: 'fam_p1', role: 'caregiver', expiresAt: NOW + DAY }
    expect(inviteState(null, { uid: 'p2', nowMs: NOW })).toBe('missing')
    expect(inviteState(inv, { uid: 'p2', nowMs: NOW })).toBe('ok')
    expect(inviteState({ ...inv, expiresAt: NOW - 1 }, { uid: 'p2', nowMs: NOW })).toBe('expired')
    expect(inviteState({ ...inv, usedBy: 'p3' }, { uid: 'p2', nowMs: NOW })).toBe('used')
    expect(inviteState({ ...inv, usedBy: 'p2' }, { uid: 'p2', nowMs: NOW })).toBe('yours')
    expect(inviteState(inv, { uid: 'p1', nowMs: NOW, families: { fam_p1: 'caregiver' } })).toBe('joined')
    expect(inviteState({ ...inv, expiresAt: { toMillis: () => NOW + 5 } }, { uid: 'p2', nowMs: NOW })).toBe('ok')
  })

  it('lists only open invites, soonest to expire first', () => {
    const saved = { AAAAAAAAAA: { expiresAt: NOW + 3 * DAY }, BBBBBBBBBB: { expiresAt: NOW + DAY }, CCCCCCCCCC: { expiresAt: NOW - 1 }, DDDDDDDDDD: { expiresAt: NOW + DAY } }
    const members = [{ id: 'p2', via: { invite: 'DDDDDDDDDD' } }]
    expect(openInvites(saved, members, NOW).map(i => i.code)).toEqual(['BBBBBBBBBB', 'AAAAAAAAAA'])
  })
})

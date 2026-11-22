import { describe, it, expect } from 'vitest'
import { planRevokedFlags } from './revokedMigration'

describe('planRevokedFlags', () => {
  it('flags only inactive entries that have no flag yet', () => {
    const team = {
      p1: { c1: { active: false }, c2: { active: true }, c3: { active: false } },
      p2: { c1: { active: false } },
      p3: { c9: {} },
    }
    const revoked = { p1: { c3: true } }
    expect(planRevokedFlags(team, revoked)).toEqual([
      { parentUid: 'p1', clinicianUid: 'c1' },
      { parentUid: 'p2', clinicianUid: 'c1' },
    ])
  })
  it('handles empty input', () => {
    expect(planRevokedFlags(null)).toEqual([])
    expect(planRevokedFlags({ p1: null })).toEqual([])
  })
})

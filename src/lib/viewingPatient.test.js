import { describe, it, expect } from 'vitest'
import { resolveViewingPatient, visibleCareTeam } from './viewingPatient'

const patients = [{ uid: 'fam1' }, { uid: 'fam2' }]

describe('resolveViewingPatient', () => {
  it('uses the choice made by the person signed in now', () => {
    expect(resolveViewingPatient({ viewing: { owner: 'clin', patient: 'fam2' }, uid: 'clin', patients })).toBe('fam2')
  })

  it('never carries a choice over to the next account on the same tab', () => {
    expect(resolveViewingPatient({ viewing: { owner: 'clin', patient: 'fam1' }, uid: 'fam1', patients: [] })).toBeNull()
    expect(resolveViewingPatient({ viewing: { owner: 'clin', patient: 'fam1' }, uid: 'other', patients })).toBeNull()
  })

  it('reopens the last family after a reload while it is still linked', () => {
    expect(resolveViewingPatient({ viewing: { owner: null, patient: null }, uid: 'clin', patients, stored: 'fam1' })).toBe('fam1')
    expect(resolveViewingPatient({ viewing: { owner: null, patient: null }, uid: 'clin', patients, stored: 'gone' })).toBeNull()
  })

  it('respects an explicit "no family" choice over the stored one', () => {
    expect(resolveViewingPatient({ viewing: { owner: 'clin', patient: null }, uid: 'clin', patients, stored: 'fam1' })).toBeNull()
  })

  it('never opens the signed-in account as its own patient', () => {
    expect(resolveViewingPatient({ viewing: {}, uid: 'fam1', patients, stored: 'fam1' })).toBeNull()
  })

  it('returns nothing when signed out', () => {
    expect(resolveViewingPatient({ viewing: { owner: 'clin', patient: 'fam1' }, uid: null, patients })).toBeNull()
  })
})

describe('visibleCareTeam', () => {
  it('hides a stray entry for the parent themself', () => {
    expect(visibleCareTeam([{ uid: 'me' }, { uid: 'clin' }], 'me')).toEqual([{ uid: 'clin' }])
  })
})

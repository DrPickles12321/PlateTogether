import { describe, it, expect } from 'vitest'
import {
  familyIdFor, parentUidFor, carePlanFromPlan, nextPlanItem, sosFromEvents, careTeamFromMembers,
  caregiverEmail, clinicianNotesFromDocs, childProfileFromFamily, patientsFromUserDoc, latestSessionDate,
} from './firestoreViews'

const t = iso => new Date(iso)

describe('ids', () => {
  it('maps a parent to their family and back', () => {
    expect(familyIdFor('p1')).toBe('fam_p1')
    expect(parentUidFor('fam_p1')).toBe('p1')
    expect(parentUidFor('other')).toBeNull()
  })
})

describe('care plan', () => {
  it('joins the two plan items, newest update first', () => {
    const plan = {
      tableLines: { body: ['Phones away'], updatedAt: t('2026-11-20T10:00:00Z'), updatedBy: 'c1' },
      refusalSteps: { body: ['Stay calm'], updatedAt: t('2026-11-22T10:00:00Z'), updatedBy: 'c2' },
    }
    expect(carePlanFromPlan(plan)).toEqual({ tableReminders: ['Phones away'], refusalSteps: ['Stay calm'], updatedAt: '2026-11-22T10:00:00.000Z', updatedBy: 'c2' })
    expect(carePlanFromPlan({})).toBeNull()
  })

  it('bumps the version and keeps the owner', () => {
    expect(nextPlanItem(null, 'targets', { a: 1 }, 'c1')).toEqual({ kind: 'targets', body: { a: 1 }, ownerRole: 'therapist', version: 1, updatedBy: 'c1' })
    expect(nextPlanItem({ ownerRole: 'dietitian', version: 3 }, 'targets', {}, 'c1')).toMatchObject({ ownerRole: 'dietitian', version: 4 })
  })
})

describe('support requests', () => {
  it('opens and acknowledges, in time order', () => {
    const events = [
      { type: 'sos.resolve', ref: 's1', value: { body: 'Calling you.' }, at: t('2026-11-25T19:10:00Z') },
      { type: 'sos.open', ref: 's1', value: { note: 'Help' }, at: t('2026-11-25T19:00:00Z') },
      { type: 'sos.open', ref: 's2', value: { note: '' }, at: t('2026-11-26T19:00:00Z') },
      { type: 'meal.outcome', value: 'okay', at: t('2026-11-26T08:00:00Z') },
    ]
    expect(sosFromEvents(events)).toEqual([
      { id: 's1', createdAt: '2026-11-25T19:00:00.000Z', note: 'Help', status: 'acknowledged', response: { body: 'Calling you.', at: '2026-11-25T19:10:00.000Z' } },
      { id: 's2', createdAt: '2026-11-26T19:00:00.000Z', note: '', status: 'open' },
    ])
  })
})

describe('members', () => {
  const members = [
    { id: 'p1', role: 'caregiver', active: true, email: 'p@example.test' },
    { id: 'c1', role: 'therapist', active: true, email: 'c1@example.test', addedAt: t('2026-10-01T00:00:00Z') },
    { id: 'c2', role: 'dietitian', active: false },
    { id: 'k1', role: 'teen', active: true },
  ]

  it('lists the care team for the parent, with removed members marked', () => {
    expect(careTeamFromMembers(members)).toEqual([
      { uid: 'c1', role: 'therapist', active: true, addedAt: '2026-10-01T00:00:00.000Z', clinicianEmail: 'c1@example.test' },
      { uid: 'c2', role: 'dietitian', active: false, addedAt: null, clinicianEmail: 'A clinician' },
    ])
  })

  it('finds a caregiver email for the family name fallback', () => {
    expect(caregiverEmail(members)).toBe('p@example.test')
    expect(caregiverEmail([])).toBeNull()
  })
})

describe('notes, profile, patients and sessions', () => {
  it('sorts clinicians\' notes newest first with the old field names', () => {
    const notes = clinicianNotesFromDocs([
      { id: 'a', body: 'Old', by: null, at: t('2026-11-01T00:00:00Z') },
      { id: 'b', body: 'New', by: 'c1', at: t('2026-11-20T00:00:00Z') },
    ])
    expect(notes.map(n => n.id)).toEqual(['b', 'a'])
    expect(notes[0]).toEqual({ id: 'b', body: 'New', created_at: '2026-11-20T00:00:00.000Z', authorUid: 'c1' })
  })

  it('reads the child profile and phase off the family', () => {
    expect(childProfileFromFamily({ profile: { name: 'Sam', birthYear: 2012 }, phase: { value: 2 } })).toEqual({ name: 'Sam', birthYear: 2012, phase: 2 })
    expect(childProfileFromFamily({})).toBeNull()
  })

  it('lists a clinician\'s families from their user document', () => {
    expect(patientsFromUserDoc({ families: { fam_p1: 'therapist', fam_p2: 'caregiver', odd: 'therapist' } })).toEqual([{ uid: 'p1', familyId: 'fam_p1' }])
  })

  it('finds this clinician\'s latest session date', () => {
    const sessions = [{ by: 'c1', at: t('2026-11-20T15:00:00Z') }, { by: 'c1', at: t('2026-11-24T15:00:00Z') }, { by: 'c2', at: t('2026-11-26T15:00:00Z') }]
    expect(latestSessionDate(sessions, 'c1')).toBe('2026-11-24')
    expect(latestSessionDate(sessions, 'c9')).toBeNull()
  })
})

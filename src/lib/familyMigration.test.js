import { describe, it, expect } from 'vitest'
import { planMigration, summarize, verifyFamily, familyIdFor } from './familyMigration'

const NOW = new Date('2026-11-27T12:00:00Z')
const P = 'parent1', P0 = 'parent0', C1 = 'clin1', C2 = 'clin2', C3 = 'clin3'

// Fake data only.
const users = {
  [P]: {
    role: 'parent', email: 'parent@example.test', familyCode: 'ABC123',
    childProfile: { name: 'Sam', birthYear: 2012, treatmentStart: '2026-10-16', phase: 2 },
    careTeam: { [C1]: { active: true, addedAt: '2026-10-20T10:00:00Z' }, [C2]: { active: false } },
    revokedClinicians: { [C2]: true },
    mealLogs: { '2026-11-26': { dinner: { status: 'refused', items: [{ id: 'f1', name: 'Pizza', category: 'challenge' }], distress: { post: 4 } } } },
    mealTimes: { '2026-11-26': { dinner: '18:30' } },
    supplementLog: { '2026-11-26': ['Vitamin D'] },
    parentNotes: { '2026-11-26': { id: 'n1', body: 'Hard dinner.', created_at: '2026-11-26T20:00:00Z', read_at: null } },
    sos: {
      s1: { createdAt: '2026-11-25T19:00:00Z', note: 'Help', status: 'acknowledged', response: { body: 'Calling you.', at: '2026-11-25T19:10:00Z' } },
      s2: { createdAt: '2026-11-26T19:00:00Z', note: '', status: 'open' },
    },
    carePlan: { tableReminders: ['Phones away'], refusalSteps: ['Stay calm', 'Offer again'], updatedAt: '2026-11-20T10:00:00Z', updatedBy: C1 },
    nutritionalTargets: { calories: 2400 },
    prescribedSupplements: ['Vitamin D'],
    assignedChallenges: { a1: { name: 'Pizza', createdAt: '2026-11-20T10:00:00Z' } },
    nutritionDisplay: { showToParent: false, updatedAt: '2026-11-21T10:00:00Z', updatedBy: C1 },
    foodItems: { x: { id: 'f1', name: 'Pizza', category: 'challenge' }, y: { id: 'f2', name: 'Rice', category: 'familiar' } },
    usualMeals: { u1: { id: 'u1', name: 'School breakfast', mealType: 'breakfast', foods: [{ name: 'Oatmeal' }], createdAt: '2026-11-01T08:00:00Z' } },
    clinicianNotes: { cn1: { id: 'cn1', body: 'Keep snack at 3:30.', created_at: '2026-11-22T10:00:00Z', authorUid: C1 }, cn0: { id: 'cn0', body: 'Old note.', created_at: '2026-11-01T10:00:00Z' } },
    consent: { agreedAt: '2026-10-01T00:00:00Z', version: 1 },
    hiddenClinicianNoteIds: { cn0: true },
  },
  [P0]: { role: 'parent', email: 'empty@example.test' },
  [C1]: { role: 'clinician', email: 'c1@example.test', patients: { [P]: { code: 'ABC123', addedAt: '2026-10-20T10:00:00Z', lastSessionAt: '2026-11-24' } } },
  [C2]: { role: 'clinician', email: 'c2@example.test', patients: { [P]: { code: 'ABC123' } } },
  // An old link from before careTeam entries existed: still counts as active.
  [C3]: { role: 'clinician', email: 'c3@example.test', patients: { [P]: { code: 'ABC123' } }, hiddenParentNoteIds: { [P]: { n9: true } } },
  noRole: { email: 'half-signed-up@example.test' },
}

const plan = planMigration(users, { now: NOW })
const fam = plan.families.find(f => f.parentUid === P)

describe('planMigration', () => {
  it('makes one family per parent with a stable id', () => {
    expect(plan.families.map(f => f.familyId).sort()).toEqual([familyIdFor(P0), familyIdFor(P)].sort())
    expect(fam.family).toEqual({
      createdBy: P, createdAt: NOW, program: 'anorexia-fbt',
      profile: { name: 'Sam', birthYear: 2012, treatmentStart: '2026-10-16' },
      phase: { value: 2, since: null, setBy: null },
    })
  })

  it('keeps who has access: removed and revoked clinicians stay out, old links stay in', () => {
    expect(fam.members[P]).toMatchObject({ role: 'caregiver', active: true })
    expect(fam.members[C1]).toMatchObject({ role: 'therapist', active: true, addedAt: new Date('2026-10-20T10:00:00Z') })
    expect(fam.members[C2]).toMatchObject({ role: 'therapist', active: false })
    expect(fam.revoked).toEqual({ [C2]: { at: NOW } })
    expect(fam.members[C3]).toMatchObject({ role: 'therapist', active: true })
  })

  it('turns meals, notes and support requests into events, with stable ids', () => {
    const events = Object.values(fam.events)
    expect(Object.keys(fam.events)[0]).toBe('legacy-00000')
    expect(events.find(e => e.type === 'meal.outcome')).toMatchObject({ date: '2026-11-26', meal: 'dinner', value: 'refused', by: P, at: null, legacy: true })
    expect(events.find(e => e.type === 'note.caregiver').at).toEqual(new Date('2026-11-26T20:00:00Z'))
    expect(events.filter(e => e.type === 'sos.open').map(e => e.ref).sort()).toEqual(['s1', 's2'])
    expect(events.find(e => e.type === 'sos.resolve')).toMatchObject({ ref: 's1', value: { body: 'Calling you.' }, by: null })
  })

  it('moves the plan, foods, usual meals and clinicians\' notes', () => {
    expect(Object.keys(fam.plan).sort()).toEqual(['challenges', 'nutritionDisplay', 'refusalSteps', 'supplements', 'tableLines', 'targets'])
    expect(fam.plan.refusalSteps).toMatchObject({ body: ['Stay calm', 'Offer again'], ownerRole: 'therapist', version: 1, updatedBy: C1 })
    expect(fam.plan.challenges.body).toEqual([{ id: 'a1', name: 'Pizza', createdAt: '2026-11-20T10:00:00Z' }])
    expect(Object.keys(fam.foods).sort()).toEqual(['f1', 'f2'])
    expect(fam.usualMeals.u1.name).toBe('School breakfast')
    expect(fam.clinicianNotes.cn1).toEqual({ body: 'Keep snack at 3:30.', by: C1, at: new Date('2026-11-22T10:00:00Z') })
    expect(fam.clinicianNotes.cn0.by).toBeNull()
  })

  it('keeps each clinician\'s last session as their own mark', () => {
    expect(fam.sessions).toEqual({ [`legacy-${C1}`]: { kind: 'session', by: C1, at: new Date('2026-11-24T12:00:00Z') } })
  })

  it('writes user documents, private settings and the family code', () => {
    expect(plan.userDocs[P].doc).toEqual({ email: 'parent@example.test', accountType: 'family', families: { [familyIdFor(P)]: 'caregiver' } })
    expect(plan.userDocs[P].private).toMatchObject({ familyCode: 'ABC123', consent: { version: 1 }, hiddenClinicianNoteIds: { cn0: true } })
    expect(fam.members[P].email).toBe('parent@example.test')
    expect(fam.members[C1].email).toBe('c1@example.test')
    expect(plan.userDocs[C1].doc).toEqual({ email: 'c1@example.test', accountType: 'clinician', families: { [familyIdFor(P)]: 'therapist' } })
    expect(plan.userDocs[C3].private.hiddenParentNoteIds).toEqual({ [P]: { n9: true } })
    expect(plan.familyCodes).toEqual({ ABC123: { familyId: familyIdFor(P), createdBy: P } })
  })

  it('skips accounts with no role, and handles a parent with no data', () => {
    expect(plan.skipped).toEqual(['noRole'])
    const empty = plan.families.find(f => f.parentUid === P0)
    expect(Object.keys(empty.events)).toEqual([])
    expect(Object.keys(empty.members)).toEqual([P0])
  })
})

describe('summarize', () => {
  it('counts without any names, emails or content', () => {
    const s = summarize(plan)
    expect(s).toMatchObject({ families: 2, users: 5, familyCodes: 1, revoked: 1, skippedUsers: 1 })
    expect(JSON.stringify(s)).not.toMatch(/example\.test|Sam|Pizza/)
  })
})

describe('verifyFamily', () => {
  it('passes when the migrated events show the same as the original', () => {
    expect(verifyFamily(users[P], Object.values(fam.events))).toEqual([])
  })

  it('names the meal that differs, without its content', () => {
    const events = Object.values(fam.events).map(e => (e.type === 'meal.outcome' ? { ...e, value: 'okay' } : e))
    expect(verifyFamily(users[P], events)).toEqual(['meal 2026-11-26 dinner'])
  })
})

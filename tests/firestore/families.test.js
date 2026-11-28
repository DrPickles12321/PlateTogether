// Runs against the Firestore emulator: `npm run test:firestore`.
// One test per invariant in firestore.rules (docs/plans/2026-11-27-fbt-framework.md, section 7). Fake IDs only.
import { readFileSync } from 'node:fs'
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, writeBatch,
  serverTimestamp, Timestamp, deleteField,
} from 'firebase/firestore'

const F = 'fam1'
const P1 = 'parent1', P2 = 'parent2', THER = 'ther1', DIET = 'diet1', TEEN = 'teen1', COORD = 'coord1'
const LEFT = 'ther-left', REVOKED = 'ther-revoked', STRANGER = 'stranger', NEWCLIN = 'clin-new', NEWPARENT = 'parent-new'
const CODE = 'FAMCODE1', INVITE = 'INVITE1', EXPIRED = 'INVITE-OLD'

let env

beforeAll(async () => {
  const [host, port] = (globalThis.process?.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':')
  env = await initializeTestEnvironment({
    projectId: 'demo-plate',
    firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(() => env.cleanup())

const past = Timestamp.fromDate(new Date('2026-01-01T00:00:00Z'))
const future = Timestamp.fromDate(new Date(Date.now() + 7 * 86400000))
const member = (role, extra = {}) => ({ role, active: true, addedAt: past, addedBy: 'seed', ...extra })

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    const users = { [P1]: 'family', [P2]: 'family', [TEEN]: 'family', [NEWPARENT]: 'family', [STRANGER]: 'family',
      [THER]: 'clinician', [DIET]: 'clinician', [COORD]: 'clinician', [LEFT]: 'clinician', [REVOKED]: 'clinician', [NEWCLIN]: 'clinician' }
    for (const [u, accountType] of Object.entries(users)) await setDoc(doc(db, `users/${u}`), { accountType })
    await setDoc(doc(db, `families/${F}`), { createdBy: P1, createdAt: past, program: 'anorexia-fbt', profile: { name: 'Sam' } })
    const members = {
      [P1]: member('caregiver'), [P2]: member('caregiver'), [THER]: member('therapist'), [DIET]: member('dietitian'),
      [TEEN]: member('teen'), [COORD]: member('coordinator'), [LEFT]: member('therapist', { active: false }),
      [REVOKED]: member('therapist'),
    }
    for (const [u, m] of Object.entries(members)) await setDoc(doc(db, `families/${F}/members/${u}`), m)
    await setDoc(doc(db, `families/${F}/revoked/${REVOKED}`), { at: past })
    await setDoc(doc(db, `familyCodes/${CODE}`), { familyId: F, createdBy: P1 })
    await setDoc(doc(db, `invites/${INVITE}`), { familyId: F, role: 'caregiver', createdBy: P1, expiresAt: future })
    await setDoc(doc(db, `invites/${EXPIRED}`), { familyId: F, role: 'caregiver', createdBy: P1, expiresAt: past })
    await setDoc(doc(db, `families/${F}/events/e1`), { type: 'meal.outcome', date: '2026-11-27', meal: 'dinner', value: 'refused', by: P1, at: past, v: 1 })
    await setDoc(doc(db, `families/${F}/measurements/m1`), { kind: 'weight', value: 45.2, unit: 'kg', by: THER, at: past })
    await setDoc(doc(db, `families/${F}/measurements/m2`), { kind: 'heartRate', value: 52, unit: 'bpm', by: THER, at: past })
    await setDoc(doc(db, `families/${F}/plan/refusal`), { kind: 'refusalSteps', body: ['Stay calm'], ownerRole: 'therapist', version: 1, updatedAt: past, updatedBy: THER })
    await setDoc(doc(db, `families/${F}/teamNotes/n1`), { body: 'Vitals fine.', by: DIET, role: 'dietitian', at: past })
    await setDoc(doc(db, `families/${F}/alerts/a1`), { type: 'hardMeals', toRole: 'therapist', createdAt: past })
  })
})

const as = u => env.authenticatedContext(u).firestore()
const event = (by, extra = {}) => ({ type: 'meal.outcome', date: '2026-11-27', meal: 'lunch', value: 'okay', by, at: serverTimestamp(), v: 1, ...extra })

describe('who can read the family', () => {
  it('active members can; strangers, people who left and revoked members cannot', async () => {
    for (const u of [P1, THER, TEEN, COORD]) await assertSucceeds(getDoc(doc(as(u), `families/${F}`)))
    for (const u of [STRANGER, LEFT, REVOKED]) await assertFails(getDoc(doc(as(u), `families/${F}`)))
  })

  it('the revoked marker outranks an active membership, and only caregivers write it', async () => {
    await assertFails(getDoc(doc(as(REVOKED), `families/${F}/events/e1`)))
    await assertFails(deleteDoc(doc(as(REVOKED), `families/${F}/revoked/${REVOKED}`)))
    await assertFails(setDoc(doc(as(THER), `families/${F}/revoked/${DIET}`), { at: past }))
    await assertSucceeds(setDoc(doc(as(P2), `families/${F}/revoked/${DIET}`), { at: past }))
    await assertFails(getDoc(doc(as(DIET), `families/${F}`)))
  })
})

describe('creating a family and joining it', () => {
  it('a family account creates a family and joins it as caregiver in one batch', async () => {
    const db = as(NEWPARENT)
    const batch = writeBatch(db)
    batch.set(doc(db, 'families/fam2'), { createdBy: NEWPARENT, createdAt: serverTimestamp(), program: 'anorexia-fbt', profile: { name: 'A. B.' } })
    batch.set(doc(db, `families/fam2/members/${NEWPARENT}`), { role: 'caregiver', active: true, addedAt: serverTimestamp(), addedBy: NEWPARENT })
    await assertSucceeds(batch.commit())
  })

  it('a clinician account cannot create a family', async () => {
    await assertFails(setDoc(doc(as(NEWCLIN), 'families/fam3'), { createdBy: NEWCLIN, createdAt: serverTimestamp(), program: 'anorexia-fbt' }))
  })

  it('nobody joins another family without proof', async () => {
    await assertFails(setDoc(doc(as(STRANGER), `families/${F}/members/${STRANGER}`), { role: 'caregiver', active: true, addedAt: serverTimestamp(), addedBy: STRANGER }))
  })

  it('an unused invite lets you join, once, with its role', async () => {
    const db = as(NEWPARENT)
    const b1 = writeBatch(db)
    b1.update(doc(db, `invites/${INVITE}`), { usedBy: NEWPARENT })
    b1.set(doc(db, `families/${F}/members/${NEWPARENT}`), { role: 'caregiver', active: true, addedAt: serverTimestamp(), addedBy: NEWPARENT, via: { invite: INVITE } })
    await assertSucceeds(b1.commit())
    const other = as(STRANGER)
    const b2 = writeBatch(other)
    b2.update(doc(other, `invites/${INVITE}`), { usedBy: STRANGER })
    b2.set(doc(other, `families/${F}/members/${STRANGER}`), { role: 'caregiver', active: true, addedAt: serverTimestamp(), addedBy: STRANGER, via: { invite: INVITE } })
    await assertFails(b2.commit())
  })

  it('an invite cannot be used for a different role, or after it expires', async () => {
    const db = as(NEWPARENT)
    const b1 = writeBatch(db)
    b1.update(doc(db, `invites/${INVITE}`), { usedBy: NEWPARENT })
    b1.set(doc(db, `families/${F}/members/${NEWPARENT}`), { role: 'therapist', active: true, addedAt: serverTimestamp(), addedBy: NEWPARENT, via: { invite: INVITE } })
    await assertFails(b1.commit())
    const b2 = writeBatch(db)
    b2.update(doc(db, `invites/${EXPIRED}`), { usedBy: NEWPARENT })
    b2.set(doc(db, `families/${F}/members/${NEWPARENT}`), { role: 'caregiver', active: true, addedAt: serverTimestamp(), addedBy: NEWPARENT, via: { invite: EXPIRED } })
    await assertFails(b2.commit())
  })

  it('a clinician account cannot take a caregiver invite', async () => {
    const db = as(NEWCLIN)
    const b = writeBatch(db)
    b.update(doc(db, `invites/${INVITE}`), { usedBy: NEWCLIN })
    b.set(doc(db, `families/${F}/members/${NEWCLIN}`), { role: 'caregiver', active: true, addedAt: serverTimestamp(), addedBy: NEWCLIN, via: { invite: INVITE } })
    await assertFails(b.commit())
  })

  it('a family code lets a clinician account join in a team role, never as caregiver', async () => {
    const base = { active: true, addedAt: serverTimestamp(), via: { familyCode: CODE } }
    await assertFails(setDoc(doc(as(NEWCLIN), `families/${F}/members/${NEWCLIN}`), { ...base, addedBy: NEWCLIN, role: 'caregiver' }))
    await assertSucceeds(setDoc(doc(as(NEWCLIN), `families/${F}/members/${NEWCLIN}`), { ...base, addedBy: NEWCLIN, role: 'dietitian' }))
    await assertFails(setDoc(doc(as(STRANGER), `families/${F}/members/${STRANGER}`), { ...base, addedBy: STRANGER, role: 'therapist' }))
  })

  it('a revoked member cannot rejoin with the family code', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), `families/${F}/revoked/${NEWCLIN}`), { at: past })
    })
    await assertFails(setDoc(doc(as(NEWCLIN), `families/${F}/members/${NEWCLIN}`), { role: 'therapist', active: true, addedAt: serverTimestamp(), addedBy: NEWCLIN, via: { familyCode: CODE } }))
  })
})

describe('managing members', () => {
  it('caregivers can deactivate anyone; a member can leave but not come back', async () => {
    await assertSucceeds(updateDoc(doc(as(P1), `families/${F}/members/${DIET}`), { active: false }))
    await assertSucceeds(updateDoc(doc(as(THER), `families/${F}/members/${THER}`), { active: false }))
    await assertFails(updateDoc(doc(as(LEFT), `families/${F}/members/${LEFT}`), { active: true }))
  })

  it('clinicians cannot change members; a coordinator changes team members only', async () => {
    await assertFails(updateDoc(doc(as(THER), `families/${F}/members/${P2}`), { active: false }))
    await assertSucceeds(updateDoc(doc(as(COORD), `families/${F}/members/${DIET}`), { role: 'pediatrician' }))
    await assertFails(updateDoc(doc(as(COORD), `families/${F}/members/${P2}`), { active: false }))
    await assertFails(updateDoc(doc(as(COORD), `families/${F}/members/${DIET}`), { role: 'caregiver' }))
  })

  it('members are never deleted', async () => {
    await assertFails(deleteDoc(doc(as(P1), `families/${F}/members/${DIET}`)))
  })

  it('caregivers invite anyone; a coordinator invites team roles only; clinicians cannot invite', async () => {
    const inv = (by, role) => ({ familyId: F, role, createdBy: by, expiresAt: future })
    await assertSucceeds(setDoc(doc(as(P1), 'invites/I2'), inv(P1, 'teen')))
    await assertSucceeds(setDoc(doc(as(COORD), 'invites/I3'), inv(COORD, 'dietitian')))
    await assertFails(setDoc(doc(as(COORD), 'invites/I4'), inv(COORD, 'caregiver')))
    await assertFails(setDoc(doc(as(THER), 'invites/I5'), inv(THER, 'dietitian')))
  })
})

describe('the family document', () => {
  it('caregivers edit the profile; the lead therapist sets phase and weight sharing', async () => {
    await assertSucceeds(updateDoc(doc(as(P1), `families/${F}`), { profile: { name: 'S.', birthYear: 2012 } }))
    await assertFails(updateDoc(doc(as(P1), `families/${F}`), { phase: { value: 2, since: serverTimestamp(), setBy: P1 } }))
    await assertSucceeds(updateDoc(doc(as(THER), `families/${F}`), { phase: { value: 2, since: serverTimestamp(), setBy: THER } }))
    await assertSucceeds(updateDoc(doc(as(THER), `families/${F}`), { measurementsShared: true }))
    await assertFails(updateDoc(doc(as(DIET), `families/${F}`), { measurementsShared: true }))
    await assertFails(updateDoc(doc(as(THER), `families/${F}`), { profile: { name: 'X' } }))
  })

  it('checks the profile and phase shapes', async () => {
    await assertFails(updateDoc(doc(as(P1), `families/${F}`), { profile: { name: '' } }))
    await assertFails(updateDoc(doc(as(P1), `families/${F}`), { profile: { name: 'Sam', weight: 40 } }))
    await assertFails(updateDoc(doc(as(THER), `families/${F}`), { phase: { value: 7, since: serverTimestamp(), setBy: THER } }))
  })
})

describe('events are an append-only record', () => {
  it('caregivers add meal events as themselves, stamped by the server', async () => {
    await assertSucceeds(setDoc(doc(as(P2), `families/${F}/events/e2`), event(P2)))
    await assertFails(setDoc(doc(as(P2), `families/${F}/events/e3`), event(P1)))
    await assertFails(setDoc(doc(as(P2), `families/${F}/events/e4`), { ...event(P2), at: past }))
  })

  it('nobody edits or deletes an event, not even its author', async () => {
    await assertFails(updateDoc(doc(as(P1), `families/${F}/events/e1`), { value: 'okay' }))
    await assertFails(deleteDoc(doc(as(P1), `families/${F}/events/e1`)))
    await assertFails(updateDoc(doc(as(THER), `families/${F}/events/e1`), { value: 'okay' }))
  })

  it('clinicians add only their own event types (marking a note read), never meal events', async () => {
    await assertFails(setDoc(doc(as(THER), `families/${F}/events/e5`), event(THER)))
    await assertSucceeds(setDoc(doc(as(THER), `families/${F}/events/e6`), { type: 'note.read', date: '2026-11-27', ref: 'e1', by: THER, at: serverTimestamp(), v: 1 }))
  })

  it('checks event shape', async () => {
    await assertFails(setDoc(doc(as(P1), `families/${F}/events/e7`), event(P1, { type: 'weight' })))
    await assertFails(setDoc(doc(as(P1), `families/${F}/events/e8`), event(P1, { meal: 'brunch' })))
    await assertFails(setDoc(doc(as(P1), `families/${F}/events/e9`), event(P1, { calories: 500 })))
  })

  it('the teen and the coordinator cannot read or add events', async () => {
    for (const u of [TEEN, COORD]) {
      await assertFails(getDoc(doc(as(u), `families/${F}/events/e1`)))
      await assertFails(setDoc(doc(as(u), `families/${F}/events/x-${u}`), event(u)))
    }
  })
})

describe('the plan', () => {
  const item = (by, ownerRole, version) => ({ kind: 'targets', body: ['Three meals, three snacks'], ownerRole, version, updatedAt: serverTimestamp(), updatedBy: by })

  it('each role writes its own items; the lead therapist may write any', async () => {
    await assertSucceeds(setDoc(doc(as(DIET), `families/${F}/plan/targets`), item(DIET, 'dietitian', 1)))
    await assertFails(setDoc(doc(as(DIET), `families/${F}/plan/other`), item(DIET, 'therapist', 1)))
    await assertSucceeds(setDoc(doc(as(THER), `families/${F}/plan/targets2`), item(THER, 'dietitian', 1)))
  })

  it('an update keeps the owner and bumps the version; only the owner or the lead updates', async () => {
    await assertFails(setDoc(doc(as(DIET), `families/${F}/plan/refusal`), { ...item(DIET, 'therapist', 2), kind: 'refusalSteps' }))
    await assertSucceeds(setDoc(doc(as(THER), `families/${F}/plan/refusal`), { ...item(THER, 'therapist', 2), kind: 'refusalSteps' }))
    await assertFails(setDoc(doc(as(THER), `families/${F}/plan/refusal`), { ...item(THER, 'dietitian', 3), kind: 'refusalSteps' }))
  })

  it('caregivers read the plan but cannot write it; the teen cannot read it', async () => {
    await assertSucceeds(getDoc(doc(as(P1), `families/${F}/plan/refusal`)))
    await assertFails(setDoc(doc(as(P1), `families/${F}/plan/refusal`), item(P1, 'therapist', 2)))
    await assertFails(getDoc(doc(as(TEEN), `families/${F}/plan/refusal`)))
  })
})

describe('clinic measurements', () => {
  it('the team records and reads them; nobody edits them; caregivers cannot record them', async () => {
    await assertSucceeds(setDoc(doc(as(DIET), `families/${F}/measurements/m3`), { kind: 'weight', value: 45.9, unit: 'kg', by: DIET, at: serverTimestamp() }))
    await assertSucceeds(getDoc(doc(as(DIET), `families/${F}/measurements/m2`)))
    await assertFails(updateDoc(doc(as(THER), `families/${F}/measurements/m1`), { value: 46 }))
    await assertFails(setDoc(doc(as(P1), `families/${F}/measurements/m4`), { kind: 'weight', value: 40, unit: 'kg', by: P1, at: serverTimestamp() }))
  })

  it('a reading must be well formed: known kind and unit, a visit date, blood pressure as two numbers', async () => {
    const m = extra => setDoc(doc(as(THER), `families/${F}/measurements/x${Math.random().toString(36).slice(2)}`), { by: THER, at: serverTimestamp(), ...extra })
    await assertSucceeds(m({ kind: 'bloodPressure', value: 104, value2: 62, unit: 'mmHg', date: '2026-11-28' }))
    await assertSucceeds(m({ kind: 'heartRate', value: 48, unit: 'bpm', date: '2026-11-28' }))
    await assertSucceeds(m({ kind: 'weight', value: 101.5, unit: 'lb', date: '2026-11-28' }))
    await assertFails(m({ kind: 'bloodPressure', value: 104, unit: 'mmHg' }))
    await assertFails(m({ kind: 'weight', value: 45, value2: 3, unit: 'kg' }))
    await assertFails(m({ kind: 'weight', value: 45, unit: 'stone' }))
    await assertFails(m({ kind: 'heartRate', value: 48, unit: 'bpm', date: 'yesterday' }))
    await assertFails(m({ kind: 'mood', value: 3, unit: 'x' }))
  })

  it('caregivers see weight only after the lead shares it, and never other vitals; the teen never', async () => {
    await assertFails(getDoc(doc(as(P1), `families/${F}/measurements/m1`)))
    await env.withSecurityRulesDisabled(async ctx => {
      await updateDoc(doc(ctx.firestore(), `families/${F}`), { measurementsShared: true })
    })
    await assertSucceeds(getDoc(doc(as(P1), `families/${F}/measurements/m1`)))
    await assertSucceeds(getDocs(query(collection(as(P1), `families/${F}/measurements`), where('kind', '==', 'weight'))))
    await assertFails(getDoc(doc(as(P1), `families/${F}/measurements/m2`)))
    await assertFails(getDoc(doc(as(TEEN), `families/${F}/measurements/m1`)))
  })
})

describe('team notes', () => {
  it('the team reads and writes them; the author alone edits; the family cannot read them', async () => {
    await assertSucceeds(setDoc(doc(as(THER), `families/${F}/teamNotes/n2`), { body: 'Phase 1 for now.', by: THER, role: 'therapist', at: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(as(DIET), `families/${F}/teamNotes/n1`), { body: 'Vitals fine, recheck in 2 weeks.' }))
    await assertFails(updateDoc(doc(as(THER), `families/${F}/teamNotes/n1`), { body: 'Changed.' }))
    await assertFails(deleteDoc(doc(as(DIET), `families/${F}/teamNotes/n1`)))
    for (const u of [P1, TEEN, COORD]) await assertFails(getDoc(doc(as(u), `families/${F}/teamNotes/n1`)))
  })
})

describe('caregiver check-ins', () => {
  it('one per caregiver per week, in range, readable by that caregiver and the team only', async () => {
    const c = { by: P1, week: '2026-W48', strain: 4, support: 2 }
    await assertSucceeds(setDoc(doc(as(P1), `families/${F}/checkins/${P1}_2026-W48`), c))
    await assertFails(setDoc(doc(as(P1), `families/${F}/checkins/${P2}_2026-W48`), c))
    await assertFails(setDoc(doc(as(P1), `families/${F}/checkins/${P1}_2026-W49`), { ...c, strain: 9 }))
    await assertSucceeds(getDoc(doc(as(THER), `families/${F}/checkins/${P1}_2026-W48`)))
    await assertSucceeds(getDoc(doc(as(P1), `families/${F}/checkins/${P1}_2026-W48`)))
    await assertFails(getDoc(doc(as(P2), `families/${F}/checkins/${P1}_2026-W48`)))
    await assertFails(getDoc(doc(as(TEEN), `families/${F}/checkins/${P1}_2026-W48`)))
  })
})

describe('teen proposals', () => {
  const proposal = () => ({ meal: 'snack', text: 'Granola bar after school', by: TEEN, at: serverTimestamp() })

  it('not in phase 1', async () => {
    await assertFails(setDoc(doc(as(TEEN), `families/${F}/proposals/p1`), proposal()))
  })

  it('from phase 2 the teen proposes and a caregiver decides once', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await updateDoc(doc(ctx.firestore(), `families/${F}`), { phase: { value: 2, since: past, setBy: THER } })
    })
    await assertSucceeds(setDoc(doc(as(TEEN), `families/${F}/proposals/p1`), proposal()))
    await assertSucceeds(getDoc(doc(as(TEEN), `families/${F}/proposals/p1`)))
    await assertFails(updateDoc(doc(as(TEEN), `families/${F}/proposals/p1`), { decision: 'approved', decidedBy: TEEN, decidedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(as(P1), `families/${F}/proposals/p1`), { decision: 'approved', decidedBy: P1, decidedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(as(P2), `families/${F}/proposals/p1`), { decision: 'declined', decidedBy: P2, decidedAt: serverTimestamp() }))
  })
})

describe('server-only and user documents', () => {
  it('alerts and rollups are never created by clients; the team acknowledges an alert once', async () => {
    await assertFails(setDoc(doc(as(THER), `families/${F}/alerts/a2`), { type: 'x', toRole: 'therapist', createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(as(P1), `families/${F}/rollups/2026-W48`), { meals: 20 }))
    await assertSucceeds(updateDoc(doc(as(THER), `families/${F}/alerts/a1`), { ackBy: THER, ackAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(as(DIET), `families/${F}/alerts/a1`), { ackBy: DIET, ackAt: serverTimestamp() }))
    await assertFails(getDoc(doc(as(P1), `families/${F}/alerts/a1`)))
  })

  it('accountType is write-once, and users read only themselves', async () => {
    await assertFails(updateDoc(doc(as(P1), `users/${P1}`), { accountType: 'clinician' }))
    await assertSucceeds(updateDoc(doc(as(P1), `users/${P1}`), { families: { [F]: 'caregiver' } }))
    await assertFails(getDoc(doc(as(P1), `users/${THER}`)))
  })
})

describe('foods, usual meals and clinicians\' notes', () => {
  const seed = async () => env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await setDoc(doc(db, `families/${F}/foods/f1`), { id: 'f1', name: 'Pizza', category: 'challenge' })
    await setDoc(doc(db, `families/${F}/clinicianNotes/old`), { body: 'Older note.', by: null, at: past })
    await setDoc(doc(db, `families/${F}/clinicianNotes/mine`), { body: 'Keep snack at 3:30.', by: THER, at: past })
  })

  it('caregivers manage foods; the team may only retype one; the teen cannot read them', async () => {
    await seed()
    await assertSucceeds(setDoc(doc(as(P1), `families/${F}/foods/f2`), { id: 'f2', name: 'Rice', category: 'familiar' }))
    await assertSucceeds(updateDoc(doc(as(THER), `families/${F}/foods/f1`), { category: 'working_on' }))
    await assertFails(updateDoc(doc(as(THER), `families/${F}/foods/f1`), { name: 'Salad' }))
    await assertFails(deleteDoc(doc(as(THER), `families/${F}/foods/f1`)))
    await assertFails(getDoc(doc(as(TEEN), `families/${F}/foods/f1`)))
  })

  it('caregivers save usual meals with a checked shape', async () => {
    const meal = { id: 'u1', name: 'School-day breakfast', mealType: 'breakfast', foods: [{ name: 'Oatmeal' }], createdAt: '2026-11-27T08:00:00Z' }
    await assertSucceeds(setDoc(doc(as(P1), `families/${F}/usualMeals/u1`), meal))
    await assertFails(setDoc(doc(as(P1), `families/${F}/usualMeals/u2`), { ...meal, id: 'u2', mealType: 'brunch' }))
    await assertFails(setDoc(doc(as(THER), `families/${F}/usualMeals/u3`), { ...meal, id: 'u3' }))
  })

  it('clinicians write notes to the family as themselves; caregivers read them', async () => {
    await seed()
    await assertSucceeds(setDoc(doc(as(DIET), `families/${F}/clinicianNotes/n9`), { body: 'Great week.', by: DIET, at: serverTimestamp() }))
    await assertFails(setDoc(doc(as(DIET), `families/${F}/clinicianNotes/n8`), { body: 'x', by: THER, at: serverTimestamp() }))
    await assertFails(setDoc(doc(as(P1), `families/${F}/clinicianNotes/n7`), { body: 'x', by: P1, at: serverTimestamp() }))
    await assertSucceeds(getDoc(doc(as(P1), `families/${F}/clinicianNotes/mine`)))
  })

  it('only the author edits or deletes a note; an older note with no author is claimed on edit', async () => {
    await seed()
    await assertFails(updateDoc(doc(as(DIET), `families/${F}/clinicianNotes/mine`), { body: 'Changed', by: DIET, updatedAt: serverTimestamp() }))
    await assertFails(deleteDoc(doc(as(DIET), `families/${F}/clinicianNotes/mine`)))
    await assertSucceeds(updateDoc(doc(as(THER), `families/${F}/clinicianNotes/mine`), { body: 'Keep snack at 3:30 on school days.', by: THER, updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(as(DIET), `families/${F}/clinicianNotes/old`), { body: 'Older note, updated.', by: DIET, updatedAt: serverTimestamp() }))
    await assertFails(deleteDoc(doc(as(P1), `families/${F}/clinicianNotes/mine`)))
  })

  it('each person\'s private settings are theirs alone', async () => {
    await assertSucceeds(setDoc(doc(as(P1), `users/${P1}/private/settings`), { hiddenClinicianNoteIds: { n1: true } }))
    await assertFails(getDoc(doc(as(THER), `users/${P1}/private/settings`)))
    await assertFails(setDoc(doc(as(THER), `users/${P1}/private/settings`), { x: 1 }))
  })
})

describe('member email and clearing a phase', () => {
  it('a member may store only their own sign-in email', async () => {
    const own = env.authenticatedContext(NEWCLIN, { email: 'new@example.test' }).firestore()
    const base = { role: 'dietitian', active: true, addedAt: serverTimestamp(), addedBy: NEWCLIN, via: { familyCode: CODE } }
    await assertFails(setDoc(doc(own, `families/${F}/members/${NEWCLIN}`), { ...base, email: 'someone@example.test' }))
    await assertSucceeds(setDoc(doc(own, `families/${F}/members/${NEWCLIN}`), { ...base, email: 'new@example.test' }))
  })

  it('the lead therapist can clear the phase', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await updateDoc(doc(ctx.firestore(), `families/${F}`), { phase: { value: 2, since: past, setBy: THER } })
    })
    await assertSucceeds(updateDoc(doc(as(THER), `families/${F}`), { phase: deleteField() }))
  })
})

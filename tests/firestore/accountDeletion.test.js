// Runs the Worker's account deletion (worker/src/accountDeletion.js + googleStore.js) against the Firestore,
// Auth and Realtime Database emulators: `npm run test:firestore`. Test files run one at a time, so the rules tests'
// data and this file's never meet. Fake IDs and text only.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { deleteAccountData } from '../../worker/src/accountDeletion.js'
import { googleStore } from '../../worker/src/googleStore.js'

const PROJECT = 'demo-plate' // the emulators run one project; the rules tests use other document paths
const env = globalThis.process.env
const hosts = {
  firestore: env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080',
  auth: env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099',
  database: env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000',
  databaseNs: PROJECT,
}
const EVENTS = 450 // more than one round of the tree delete (400)

let app, fs, auth, rtdb
const store = () => googleStore({ projectId: PROJECT, hosts })

beforeAll(async () => {
  app = initializeApp({ projectId: PROJECT, databaseURL: `http://${hosts.database}?ns=${PROJECT}` }, 'deletion-test')
  fs = getFirestore(app)
  auth = getAuth(app)
  rtdb = getDatabase(app)

  for (const uid of ['p1', 'c1', 'p9']) await auth.createUser({ uid, email: `${uid}@example.test` }).catch(() => {})

  const at = FieldValue.serverTimestamp()
  const seed = fs.batch()
  seed.set(fs.doc('families/fam_p1'), { createdBy: 'p1', program: 'anorexia-fbt', profile: { name: 'Fake Child' } })
  seed.set(fs.doc('families/fam_p1/members/p1'), { role: 'caregiver', active: true, email: 'p1@example.test' })
  seed.set(fs.doc('families/fam_p1/members/c1'), { role: 'therapist', active: true, email: 'c1@example.test' })
  seed.set(fs.doc('families/fam_p1/plan/tableLines'), { body: ['Fake line'], version: 1 })
  seed.set(fs.doc('families/fam_p1/clinicianNotes/n1'), { body: 'Fake note', by: 'c1', at })
  seed.set(fs.doc('familyCodes/FAKE01'), { familyId: 'fam_p1', createdBy: 'p1' })
  seed.set(fs.doc('users/p1'), { accountType: 'family', email: 'p1@example.test', families: { fam_p1: 'caregiver' } })
  seed.set(fs.doc('users/p1/private/settings'), { familyCode: 'FAKE01', consent: { version: 'test' } })
  seed.set(fs.doc('users/c1'), { accountType: 'clinician', email: 'c1@example.test', families: { fam_p1: 'therapist', fam_p9: 'therapist' } })
  seed.set(fs.doc('families/fam_p9'), { createdBy: 'p9' })
  seed.set(fs.doc('families/fam_p9/members/c1'), { role: 'therapist', active: true, email: 'c1@example.test' })
  seed.set(fs.doc('families/fam_p9/clinicianNotes/n9'), { body: 'Fake note for p9', by: 'c1', at })
  seed.set(fs.doc('familyCodes/FAKE09'), { familyId: 'fam_p9', createdBy: 'p9' })
  await seed.commit()
  for (let start = 0; start < EVENTS; start += 400) {
    const b = fs.batch()
    for (let i = start; i < Math.min(start + 400, EVENTS); i++) {
      b.set(fs.doc(`families/fam_p1/events/e${i}`), { type: 'meal.outcome', date: '2026-11-01', meal: 'Lunch', value: 'okay', by: 'p1', at, v: 1 })
    }
    await b.commit()
  }

  await rtdb.ref().set({
    users: {
      p1: { role: 'parent', familyCode: 'FAKE01', careTeam: { c1: { active: true } }, mealLogs: { '2026-11-01': { Lunch: 'okay' } } },
      c1: { role: 'clinician', patients: { p1: { code: 'FAKE01' }, p9: { code: 'FAKE09' } } },
    },
    familyCodes: { FAKE01: 'p1', FAKE09: 'p9' },
  })
})

afterAll(async () => {
  await fs.recursiveDelete(fs.collection('families')).catch(() => {})
  await deleteApp(app)
})

const exists = async path => (await fs.doc(path).get()).exists
const signInExists = uid => auth.getUser(uid).then(() => true, () => false)

describe('deleting a parent account on the emulators', () => {
  it('removes the whole family, the account, the old copy and the sign-in', async () => {
    expect((await fs.collection('families/fam_p1/events').count().get()).data().count).toBe(EVENTS)

    const done = await deleteAccountData('p1', store())
    expect(done).toEqual({ family: true, leftFamilies: 0, unlinked: 1, legacy: true })

    expect(await exists('families/fam_p1')).toBe(false)
    for (const sub of ['events', 'members', 'plan', 'clinicianNotes']) {
      expect((await fs.collection(`families/fam_p1/${sub}`).get()).size).toBe(0)
    }
    expect(await exists('familyCodes/FAKE01')).toBe(false)
    expect(await exists('users/p1')).toBe(false)
    expect(await exists('users/p1/private/settings')).toBe(false)
    expect(await signInExists('p1')).toBe(false)

    expect((await fs.doc('users/c1').get()).data().families).toEqual({ fam_p9: 'therapist' })
    expect(await exists('familyCodes/FAKE09')).toBe(true)
    expect(await exists('families/fam_p9/clinicianNotes/n9')).toBe(true)
    expect(await signInExists('c1')).toBe(true)

    const old = (await rtdb.ref().get()).val()
    expect(old.users.p1).toBeUndefined()
    expect(old.users.c1.patients).toEqual({ p9: { code: 'FAKE09' } })
    expect(old.familyCodes).toEqual({ FAKE09: 'p9' })
  })

  it('finishes cleanly when run a second time', async () => {
    await expect(deleteAccountData('p1', store())).resolves.toMatchObject({ family: false })
  })
})

describe('deleting a clinician account on the emulators', () => {
  it('switches off the membership and drops the email, but keeps the family\'s records', async () => {
    const done = await deleteAccountData('c1', store())
    expect(done.leftFamilies).toBe(1)
    expect((await fs.doc('families/fam_p9/members/c1').get()).data()).toEqual({ role: 'therapist', active: false })
    expect(await exists('families/fam_p9/clinicianNotes/n9')).toBe(true)
    expect(await exists('users/c1')).toBe(false)
    expect(await signInExists('c1')).toBe(false)
    expect((await rtdb.ref('users/c1').get()).val()).toBeNull()
  })
})

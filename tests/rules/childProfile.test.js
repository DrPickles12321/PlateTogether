// Runs against the Realtime Database emulator: `npm run test:rules`.
// The parent writes the child's profile; only a linked, active clinician sets the FBT phase.
import { readFileSync } from 'node:fs'
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, set, get, update } from 'firebase/database'

const PARENT = 'parent1', CLIN = 'clin1', STRANGER = 'clin9', CODE = 'ABC123'
const path = `users/${PARENT}/childProfile`
const profile = { name: 'Sam', birthYear: 2012, treatmentStart: '2026-10-16', updatedAt: '2026-11-27T10:00:00.000Z' }

let env

beforeAll(async () => {
  const [host, port] = (globalThis.process?.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000').split(':')
  env = await initializeTestEnvironment({
    projectId: 'demo-plate',
    database: { host, port: Number(port), rules: readFileSync('database.rules.json', 'utf8') },
  })
})
afterAll(() => env.cleanup())

beforeEach(async () => {
  await env.clearDatabase()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.database()
    const link = { code: CODE, addedAt: '2026-01-01T00:00:00Z' }
    await set(ref(db, `familyCodes/${CODE}`), PARENT)
    await set(ref(db, `users/${PARENT}`), { role: 'parent', familyCode: CODE, careTeam: { [CLIN]: { active: true, ...link } } })
    await set(ref(db, `users/${CLIN}`), { role: 'clinician', patients: { [PARENT]: link } })
    await set(ref(db, `users/${STRANGER}`), { role: 'clinician' })
  })
})

const as = uid => env.authenticatedContext(uid).database()

describe('childProfile', () => {
  it('lets the parent write it and the linked clinician read it', async () => {
    await assertSucceeds(set(ref(as(PARENT), path), profile))
    await assertSucceeds(get(ref(as(CLIN), path)))
  })

  it('never lets a clinician change the name, birth year or start', async () => {
    await assertFails(set(ref(as(CLIN), `${path}/name`), 'Someone'))
    await assertFails(update(ref(as(CLIN), path), { birthYear: 2010 }))
  })

  it('lets the linked clinician set the phase, but not the parent', async () => {
    await assertSucceeds(set(ref(as(CLIN), `${path}/phase`), 1))
    await assertFails(set(ref(as(PARENT), `${path}/phase`), 2))
    // The parent's own save keeps the phase the clinician set.
    await assertSucceeds(update(ref(as(PARENT), path), { name: 'S.', updatedAt: '2026-11-28T10:00:00.000Z' }))
  })

  it('refuses an unlinked or revoked clinician', async () => {
    await assertFails(get(ref(as(STRANGER), path)))
    await assertFails(set(ref(as(STRANGER), `${path}/phase`), 1))
    await env.withSecurityRulesDisabled(async ctx => {
      await set(ref(ctx.database(), `users/${PARENT}/revokedClinicians/${CLIN}`), true)
    })
    await assertFails(set(ref(as(CLIN), `${path}/phase`), 1))
  })

  it('checks the shape', async () => {
    const parent = as(PARENT)
    await assertFails(set(ref(parent, path), { ...profile, name: '' }))
    await assertFails(set(ref(parent, path), { ...profile, name: 'x'.repeat(41) }))
    await assertFails(set(ref(parent, path), { ...profile, birthYear: '2012' }))
    await assertFails(set(ref(parent, path), { ...profile, treatmentStart: 'last month' }))
    await assertFails(set(ref(parent, path), { ...profile, weight: 40 }))
    await assertFails(set(ref(as(CLIN), `${path}/phase`), 4))
  })
})

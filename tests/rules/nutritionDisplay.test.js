// Runs against the Realtime Database emulator: `npm run test:rules`.
// Only the family's linked, active clinician decides whether the parent sees nutrition numbers.
import { readFileSync } from 'node:fs'
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, set, get } from 'firebase/database'

const PARENT = 'parent1', CLIN = 'clin1', STRANGER = 'clin9', CODE = 'ABC123'
const path = `users/${PARENT}/nutritionDisplay`
const setting = uid => ({ showToParent: true, updatedAt: '2026-11-27T10:00:00.000Z', updatedBy: uid })

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

describe('nutritionDisplay', () => {
  it('lets the linked clinician set it, and the parent read it', async () => {
    await assertSucceeds(set(ref(as(CLIN), path), setting(CLIN)))
    await assertSucceeds(get(ref(as(PARENT), path)))
  })

  it('never lets the parent change it', async () => {
    await assertFails(set(ref(as(PARENT), path), setting(PARENT)))
  })

  it('refuses an unlinked or revoked clinician', async () => {
    await assertFails(set(ref(as(STRANGER), path), setting(STRANGER)))
    await env.withSecurityRulesDisabled(async ctx => {
      await set(ref(ctx.database(), `users/${PARENT}/revokedClinicians/${CLIN}`), true)
    })
    await assertFails(set(ref(as(CLIN), path), setting(CLIN)))
  })

  it('checks the shape and who wrote it', async () => {
    const clin = as(CLIN)
    await assertFails(set(ref(clin, path), { ...setting(CLIN), showToParent: 'yes' }))
    await assertFails(set(ref(clin, path), { ...setting(CLIN), updatedBy: 'someone-else' }))
    await assertFails(set(ref(clin, path), { ...setting(CLIN), calories: 2000 }))
    await assertFails(set(ref(clin, path), { showToParent: true }))
  })
})

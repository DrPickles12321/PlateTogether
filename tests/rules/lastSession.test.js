// Runs against the Realtime Database emulator: `npm run test:rules`.
// A clinician marks their last session with a family on their own link; nobody else can.
import { readFileSync } from 'node:fs'
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, set } from 'firebase/database'

const PARENT = 'parent1', CLIN = 'clin1', OTHER = 'clin9', CODE = 'ABC123'
const path = `users/${CLIN}/patients/${PARENT}/lastSessionAt`

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
    await set(ref(db, `users/${OTHER}`), { role: 'clinician' })
  })
})

const as = uid => env.authenticatedContext(uid).database()

describe('patients/{family}/lastSessionAt', () => {
  it('lets the clinician mark a session date on their own link', async () => {
    await assertSucceeds(set(ref(as(CLIN), path), '2026-11-27'))
  })

  it('refuses anything but a date', async () => {
    await assertFails(set(ref(as(CLIN), path), 'yesterday'))
    await assertFails(set(ref(as(CLIN), path), 20261127))
  })

  it('refuses the parent and other clinicians', async () => {
    await assertFails(set(ref(as(PARENT), path), '2026-11-27'))
    await assertFails(set(ref(as(OTHER), path), '2026-11-27'))
  })

  it('cannot create a link without a family code', async () => {
    await assertFails(set(ref(as(OTHER), `users/${OTHER}/patients/${PARENT}/lastSessionAt`), '2026-11-27'))
  })
})

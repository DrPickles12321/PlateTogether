// Runs against the Realtime Database emulator: `npm run test:rules`.
// The family's meal plan: the parent or an active linked clinician may write it; a revoked or
// unlinked clinician may not; only the known fields, short strings, and the writer's own uid.
import { readFileSync } from 'node:fs'
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, set, update, get } from 'firebase/database'

const PARENT = 'parent1', CLIN = 'clin1', OTHER = 'clin2', CODE = 'ABC123'
const plan = uid => ({ tableReminders: ['Sit together'], refusalSteps: ['Stay calm'], updatedAt: '2026-01-05T10:00:00Z', updatedBy: uid })

let env

beforeAll(async () => {
  const [host, port] = (process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000').split(':')
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
    await set(ref(db, `familyCodes/${CODE}`), PARENT)
    await set(ref(db, `users/${PARENT}`), {
      email: 'parent@example.test', role: 'parent', familyCode: CODE,
      careTeam: { [CLIN]: { active: true, code: CODE, addedAt: '2026-01-01T00:00:00Z' } },
    })
    await set(ref(db, `users/${CLIN}`), {
      email: 'clin@example.test', role: 'clinician',
      patients: { [PARENT]: { code: CODE, addedAt: '2026-01-01T00:00:00Z' } },
    })
    await set(ref(db, `users/${OTHER}`), { email: 'other@example.test', role: 'clinician' })
  })
})

const dbFor = uid => env.authenticatedContext(uid).database()

describe('carePlan', () => {
  it('lets an active linked clinician write the plan, and the parent read it', async () => {
    await assertSucceeds(set(ref(dbFor(CLIN), `users/${PARENT}/carePlan`), plan(CLIN)))
    await assertSucceeds(get(ref(dbFor(PARENT), `users/${PARENT}/carePlan`)))
  })

  it('lets the parent write their own plan', async () => {
    await assertSucceeds(set(ref(dbFor(PARENT), `users/${PARENT}/carePlan`), plan(PARENT)))
  })

  it('blocks a clinician who is not linked', async () => {
    await assertFails(set(ref(dbFor(OTHER), `users/${PARENT}/carePlan`), plan(OTHER)))
  })

  it('blocks a clinician after the parent revokes access', async () => {
    await assertSucceeds(update(ref(dbFor(PARENT)), {
      [`users/${PARENT}/careTeam/${CLIN}/active`]: false,
      [`users/${PARENT}/revokedClinicians/${CLIN}`]: true,
    }))
    await assertFails(set(ref(dbFor(CLIN), `users/${PARENT}/carePlan`), plan(CLIN)))
  })

  it('rejects unknown fields, long lines, and a writer pretending to be someone else', async () => {
    const db = dbFor(CLIN)
    await assertFails(set(ref(db, `users/${PARENT}/carePlan`), { ...plan(CLIN), calories: 2000 }))
    await assertFails(set(ref(db, `users/${PARENT}/carePlan`), { ...plan(CLIN), refusalSteps: ['x'.repeat(201)] }))
    await assertFails(set(ref(db, `users/${PARENT}/carePlan`), plan(PARENT)))
  })
})

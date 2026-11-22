// Runs against the Realtime Database emulator: `npm run test:rules`.
// Covers the clinician-revocation invariants in AGENTS.md "Hard rules" #3.
import { readFileSync } from 'node:fs'
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, get, set, update, remove } from 'firebase/database'

const PARENT = 'parent1', CLIN = 'clin1', OTHER = 'clin2', CODE = 'ABC123', DAY = '2026-01-05'
const NOTE = { id: 'n1', date: DAY, body: 'fake note', created_at: '2026-01-05T10:00:00Z' }

let env

beforeAll(async () => {
  const [host, port] = (process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000').split(':')
  env = await initializeTestEnvironment({
    projectId: 'demo-plate',
    database: { host, port: Number(port), rules: readFileSync('database.rules.json', 'utf8') },
  })
})
afterAll(() => env.cleanup())

// Linked and active: the state every test starts from.
beforeEach(async () => {
  await env.clearDatabase()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.database()
    await set(ref(db, `familyCodes/${CODE}`), PARENT)
    await set(ref(db, `users/${PARENT}`), {
      email: 'parent@example.test', role: 'parent', familyCode: CODE,
      careTeam: { [CLIN]: { active: true, code: CODE, addedAt: '2026-01-01T00:00:00Z' } },
      parentNotes: { [DAY]: NOTE },
    })
    await set(ref(db, `users/${CLIN}/patients/${PARENT}`), { code: CODE, addedAt: '2026-01-01T00:00:00Z' })
    await set(ref(db, `users/${CLIN}`), {
      email: 'clin@example.test', role: 'clinician',
      patients: { [PARENT]: { code: CODE, addedAt: '2026-01-01T00:00:00Z' } },
    })
  })
})

const dbFor = uid => env.authenticatedContext(uid).database()
const revoke = db => update(ref(db), {
  [`users/${PARENT}/careTeam/${CLIN}/active`]: false,
  [`users/${PARENT}/revokedClinicians/${CLIN}`]: true,
})

describe('active clinician', () => {
  it('can read the parent record and mark a note read', async () => {
    const db = dbFor(CLIN)
    await assertSucceeds(get(ref(db, `users/${PARENT}/mealLogs`)))
    await assertSucceeds(set(ref(db, `users/${PARENT}/parentNotes/${DAY}`), { ...NOTE, read_at: '2026-01-06T00:00:00Z' }))
  })
})

describe('after the parent revokes', () => {
  beforeEach(async () => { await assertSucceeds(revoke(dbFor(PARENT))) })

  it('blocks reads and writes', async () => {
    const db = dbFor(CLIN)
    await assertFails(get(ref(db, `users/${PARENT}/mealLogs`)))
    await assertFails(set(ref(db, `users/${PARENT}/sos`), { open: true }))
    await assertFails(set(ref(db, `users/${PARENT}/clinicianNotes/x`), { body: 'x' }))
  })

  it('cannot delete their own careTeam entry', async () => {
    const db = dbFor(CLIN)
    await assertFails(remove(ref(db, `users/${PARENT}/careTeam/${CLIN}`)))
    await assertFails(get(ref(db, `users/${PARENT}/mealLogs`)))
  })

  it('cannot recreate the entry even if the parent deleted it', async () => {
    await env.withSecurityRulesDisabled(ctx => remove(ref(ctx.database(), `users/${PARENT}/careTeam/${CLIN}`)))
    const db = dbFor(CLIN)
    await assertFails(set(ref(db, `users/${PARENT}/careTeam/${CLIN}`), { active: true, code: CODE }))
    await assertFails(get(ref(db, `users/${PARENT}/mealLogs`)))
  })

  it('cannot change or delete the revoked flag', async () => {
    const db = dbFor(CLIN)
    await assertFails(remove(ref(db, `users/${PARENT}/revokedClinicians/${CLIN}`)))
    await assertFails(update(ref(db), { [`users/${PARENT}/revokedClinicians/${CLIN}`]: null }))
    await assertFails(update(ref(db, `users/${PARENT}`), { [`revokedClinicians/${CLIN}`]: null }))
    await assertFails(update(ref(db, `users/${PARENT}/careTeam/${CLIN}`), { active: true }))
  })

  it('re-enable by the parent restores access', async () => {
    await assertSucceeds(update(ref(dbFor(PARENT)), {
      [`users/${PARENT}/careTeam/${CLIN}/active`]: true,
      [`users/${PARENT}/revokedClinicians/${CLIN}`]: null,
    }))
    await assertSucceeds(get(ref(dbFor(CLIN), `users/${PARENT}/mealLogs`)))
  })
})

describe('careTeam entry creation', () => {
  it('lets a clinician with a link create a missing legacy entry exactly once', async () => {
    await env.withSecurityRulesDisabled(ctx => remove(ref(ctx.database(), `users/${PARENT}/careTeam/${CLIN}`)))
    const db = dbFor(CLIN)
    await assertSucceeds(set(ref(db, `users/${PARENT}/careTeam/${CLIN}`), { active: true, addedAt: 'x' }))
    await assertFails(set(ref(db, `users/${PARENT}/careTeam/${CLIN}`), { active: true, addedAt: 'y' }))
  })

  it('rejects an entry for someone with no link or code', async () => {
    await assertFails(set(ref(dbFor(OTHER), `users/${PARENT}/careTeam/${OTHER}`), { active: true }))
  })

  it('rejects a clinician-created entry that is not active', async () => {
    await env.withSecurityRulesDisabled(ctx => remove(ref(ctx.database(), `users/${PARENT}/careTeam/${CLIN}`)))
    await assertFails(set(ref(dbFor(CLIN), `users/${PARENT}/careTeam/${CLIN}`), { active: false, code: CODE }))
  })

  it('does not let a clinician create an entry for another clinician', async () => {
    await assertFails(set(ref(dbFor(CLIN), `users/${PARENT}/careTeam/${OTHER}`), { active: true, code: CODE }))
  })
})

describe('parent notes', () => {
  it('lets the parent write all five fields', async () => {
    await assertSucceeds(set(ref(dbFor(PARENT), `users/${PARENT}/parentNotes/${DAY}`), { ...NOTE, read_at: '2026-01-06T00:00:00Z' }))
  })
  it('rejects unknown fields from anyone', async () => {
    await assertFails(set(ref(dbFor(CLIN), `users/${PARENT}/parentNotes/${DAY}`), { ...NOTE, extra: 'x' }))
    await assertFails(set(ref(dbFor(PARENT), `users/${PARENT}/parentNotes/${DAY}`), { ...NOTE, extra: 'x' }))
  })
  it('does not let a clinician edit the body or delete the note', async () => {
    const db = dbFor(CLIN)
    await assertFails(set(ref(db, `users/${PARENT}/parentNotes/${DAY}`), { ...NOTE, body: 'changed' }))
    await assertFails(remove(ref(db, `users/${PARENT}/parentNotes/${DAY}`)))
  })
})

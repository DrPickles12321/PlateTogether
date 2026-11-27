// Runs against the Realtime Database emulator: `npm run test:rules`.
// A clinician can only write clinician notes as themselves, and only edit or delete their own.
// Also covers the role value check. Fake data only.
import { readFileSync } from 'node:fs'
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, set, remove } from 'firebase/database'

const PARENT = 'parent1', CLIN = 'clin1', OTHER = 'clin2', CODE = 'ABC123'
const notesPath = `users/${PARENT}/clinicianNotes`
const mine = { id: 'n1', body: 'fake note', created_at: '2026-01-05T10:00:00Z', authorUid: CLIN }
const legacy = { id: 'old', body: 'older fake note', created_at: '2025-12-01T10:00:00Z' }

let env

beforeAll(async () => {
  const [host, port] = (globalThis.process?.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000').split(':')
  env = await initializeTestEnvironment({
    projectId: 'demo-plate',
    database: { host, port: Number(port), rules: readFileSync('database.rules.json', 'utf8') },
  })
})
afterAll(() => env.cleanup())

// Two clinicians, both linked and active, one note by each kind of author.
beforeEach(async () => {
  await env.clearDatabase()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.database()
    const link = { code: CODE, addedAt: '2026-01-01T00:00:00Z' }
    await set(ref(db, `familyCodes/${CODE}`), PARENT)
    await set(ref(db, `users/${PARENT}`), {
      email: 'parent@example.test', role: 'parent', familyCode: CODE,
      careTeam: { [CLIN]: { active: true, ...link }, [OTHER]: { active: true, ...link } },
      clinicianNotes: { n1: mine, old: legacy },
    })
    await set(ref(db, `users/${CLIN}`), { role: 'clinician', patients: { [PARENT]: link } })
    await set(ref(db, `users/${OTHER}`), { role: 'clinician', patients: { [PARENT]: link } })
  })
})

const as = uid => env.authenticatedContext(uid).database()

describe('clinician notes are owned by their author', () => {
  it('lets a linked clinician add a note as themselves', async () => {
    await assertSucceeds(set(ref(as(CLIN), `${notesPath}/n2`), { ...mine, id: 'n2' }))
  })

  it('refuses a note without an author or written as someone else', async () => {
    const { authorUid: _drop, ...noAuthor } = mine
    await assertFails(set(ref(as(CLIN), `${notesPath}/n3`), { ...noAuthor, id: 'n3' }))
    await assertFails(set(ref(as(OTHER), `${notesPath}/n4`), { ...mine, id: 'n4' }))
  })

  it('lets the author edit and delete their own note', async () => {
    await assertSucceeds(set(ref(as(CLIN), `${notesPath}/n1`), { ...mine, body: 'edited fake note' }))
    await assertSucceeds(remove(ref(as(CLIN), `${notesPath}/n1`)))
  })

  it("stops another clinician editing, taking over or deleting someone else's note", async () => {
    await assertFails(set(ref(as(OTHER), `${notesPath}/n1`), { ...mine, body: 'changed' }))
    await assertFails(set(ref(as(OTHER), `${notesPath}/n1`), { ...mine, authorUid: OTHER }))
    await assertFails(remove(ref(as(OTHER), `${notesPath}/n1`)))
  })

  it('stops anyone wiping every note at once', async () => {
    await assertFails(remove(ref(as(CLIN), notesPath)))
    await assertFails(set(ref(as(CLIN), notesPath), { n1: mine }))
  })

  it('keeps older notes without an author editable, claimed by whoever edits them', async () => {
    await assertSucceeds(set(ref(as(OTHER), `${notesPath}/old`), { ...legacy, authorUid: OTHER }))
    await assertFails(set(ref(as(CLIN), `${notesPath}/old`), { ...legacy, authorUid: CLIN }))
  })

  it('refuses all writes from a revoked clinician', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await set(ref(ctx.database(), `users/${PARENT}/revokedClinicians/${CLIN}`), true)
    })
    await assertFails(set(ref(as(CLIN), `${notesPath}/n5`), { ...mine, id: 'n5' }))
    await assertFails(remove(ref(as(CLIN), `${notesPath}/n1`)))
  })

  it('never lets the parent write clinician notes', async () => {
    await assertFails(set(ref(as(PARENT), `${notesPath}/p1`), { ...mine, id: 'p1', authorUid: PARENT }))
  })
})

describe('role', () => {
  it('accepts only parent or clinician, once', async () => {
    await assertFails(set(ref(as('newUser'), 'users/newUser/role'), 'admin'))
    await assertSucceeds(set(ref(as('newUser'), 'users/newUser/role'), 'parent'))
    await assertFails(set(ref(as('newUser'), 'users/newUser/role'), 'clinician'))
  })
})

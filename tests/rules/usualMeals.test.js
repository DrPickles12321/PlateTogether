// Runs against the Realtime Database emulator: `npm run test:rules`.
// Usual meals are the parent's own data: only they write them, and the shape is checked. Fake data only.
import { readFileSync } from 'node:fs'
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, set, get, remove } from 'firebase/database'

const PARENT = 'parent1', CLIN = 'clin1', CODE = 'ABC123'
const path = `users/${PARENT}/usualMeals`
const meal = {
  id: 'u1', name: 'School-day breakfast', mealType: 'breakfast', createdAt: '2026-11-26T08:00:00Z',
  foods: [{ id: 'a', name: 'Oatmeal', category: 'familiar' }, { id: 'b', name: 'Milk', category: 'familiar' }],
}

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
  })
})

const as = uid => env.authenticatedContext(uid).database()

describe('usual meals', () => {
  it('lets the parent save, read and delete one', async () => {
    await assertSucceeds(set(ref(as(PARENT), `${path}/u1`), meal))
    await assertSucceeds(get(ref(as(PARENT), `${path}/u1`)))
    await assertSucceeds(remove(ref(as(PARENT), `${path}/u1`)))
  })

  it('lets a linked clinician read but never write', async () => {
    await env.withSecurityRulesDisabled(async ctx => { await set(ref(ctx.database(), `${path}/u1`), meal) })
    await assertSucceeds(get(ref(as(CLIN), `users/${PARENT}`)))
    await assertFails(set(ref(as(CLIN), `${path}/u2`), { ...meal, id: 'u2' }))
    await assertFails(remove(ref(as(CLIN), `${path}/u1`)))
  })

  it('refuses a bad shape', async () => {
    const parent = as(PARENT)
    await assertFails(set(ref(parent, `${path}/u1`), { ...meal, id: 'other' }))
    await assertFails(set(ref(parent, `${path}/u1`), { ...meal, mealType: 'brunch' }))
    await assertFails(set(ref(parent, `${path}/u1`), { ...meal, name: '' }))
    await assertFails(set(ref(parent, `${path}/u1`), { ...meal, name: 'x'.repeat(61) }))
    await assertFails(set(ref(parent, `${path}/u1`), { ...meal, extra: 'no' }))
    await assertFails(set(ref(parent, `${path}/u1`), { ...meal, foods: [{ name: 'Oatmeal', category: 'safe' }] }))
    await assertFails(set(ref(parent, `${path}/u1`), { ...meal, foods: [{ name: 'Oatmeal', category: 'familiar', calories: 300 }] }))
  })

  it('caps a usual meal at 12 foods', async () => {
    const foods = Array.from({ length: 13 }, (_, i) => ({ id: `f${i}`, name: `Food ${i}`, category: 'familiar' }))
    await assertFails(set(ref(as(PARENT), `${path}/u1`), { ...meal, foods }))
    await assertSucceeds(set(ref(as(PARENT), `${path}/u1`), { ...meal, foods: foods.slice(0, 12) }))
  })
})

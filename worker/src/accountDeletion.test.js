import { describe, it, expect } from 'vitest'
import { deleteAccountData, signedInRecently, RECENT_SIGN_IN_SECONDS } from './accountDeletion'

// An in-memory stand-in for googleStore: documents by path, plus a Realtime Database tree.
function fakeStore(docs, legacyTree = null) {
  const data = new Map(Object.entries(docs))
  const signIns = new Set(['p1', 'c1', 'c2'])
  const tree = legacyTree ? structuredClone(legacyTree) : null
  const at = path => path.split('/').reduce((n, k) => (n == null ? undefined : n[k]), tree)
  const store = {
    data, signIns, tree,
    getDoc: async path => data.get(path) ?? null,
    listDocs: async coll => [...data.keys()]
      .filter(p => p.startsWith(`${coll}/`) && !p.slice(coll.length + 1).includes('/'))
      .map(p => ({ id: p.split('/').pop(), ...data.get(p) })),
    deleteDoc: async path => { data.delete(path) },
    deleteTree: async path => { for (const p of [...data.keys()]) if (p === path || p.startsWith(`${path}/`)) data.delete(p) },
    removeMapKey: async (path, field, key) => {
      const d = data.get(path)
      if (d?.[field]) { const rest = { ...d[field] }; delete rest[key]; data.set(path, { ...d, [field]: rest }) }
    },
    leaveFamily: async (fid, uid) => {
      const path = `families/${fid}/members/${uid}`
      const d = data.get(path)
      if (d) { const rest = { ...d }; delete rest.email; data.set(path, { ...rest, active: false }) }
    },
    deleteSignIn: async uid => { signIns.delete(uid) },
  }
  if (tree) {
    store.legacy = {
      get: async path => at(path) ?? null,
      remove: async path => {
        const keys = path.split('/'); const last = keys.pop()
        const parent = keys.reduce((n, k) => n?.[k], tree)
        if (parent) delete parent[last]
      },
    }
  }
  return store
}

const family = () => ({
  'families/fam_p1': { createdBy: 'p1', program: 'anorexia-fbt' },
  'families/fam_p1/members/p1': { role: 'caregiver', active: true, email: 'p1@example.test' },
  'families/fam_p1/members/c1': { role: 'therapist', active: true, email: 'c1@example.test' },
  'families/fam_p1/events/e1': { type: 'meal.outcome', by: 'p1' },
  'families/fam_p1/clinicianNotes/n1': { body: 'Fake note', by: 'c1' },
  'familyCodes/ABC123': { familyId: 'fam_p1', createdBy: 'p1' },
  'users/p1': { accountType: 'family', families: { fam_p1: 'caregiver' } },
  'users/p1/private/settings': { familyCode: 'ABC123' },
  'users/c1': { accountType: 'clinician', families: { fam_p1: 'therapist', fam_p9: 'therapist' } },
  'families/fam_p9': { createdBy: 'p9' },
  'families/fam_p9/members/c1': { role: 'therapist', active: true, email: 'c1@example.test' },
  'families/fam_p9/clinicianNotes/n9': { body: 'Fake note for p9', by: 'c1' },
  'familyCodes/ZZZ999': { familyId: 'fam_p9', createdBy: 'p9' },
})

describe('deleting a parent account', () => {
  it('removes the family, its code, the account and the sign-in, and unlinks the clinician', async () => {
    const store = fakeStore(family())
    const done = await deleteAccountData('p1', store)
    expect(done).toEqual({ family: true, leftFamilies: 0, unlinked: 1, legacy: false })
    expect([...store.data.keys()].filter(p => p.includes('fam_p1') || p.startsWith('users/p1') || p.includes('ABC123'))).toEqual([])
    expect(store.data.get('users/c1').families).toEqual({ fam_p9: 'therapist' })
    expect(store.data.get('familyCodes/ZZZ999')).toBeTruthy()
    expect(store.signIns.has('p1')).toBe(false)
    expect(store.signIns.has('c1')).toBe(true)
  })

  it('leaves a family code alone when it points at another family', async () => {
    const docs = family()
    docs['users/p1/private/settings'] = { familyCode: 'ZZZ999' }
    const store = fakeStore(docs)
    await deleteAccountData('p1', store)
    expect(store.data.get('familyCodes/ZZZ999')).toEqual({ familyId: 'fam_p9', createdBy: 'p9' })
  })

  it('never deletes a family the caller did not create', async () => {
    const docs = family()
    docs['families/fam_p1'] = { createdBy: 'someone-else' }
    const store = fakeStore(docs)
    const done = await deleteAccountData('p1', store)
    expect(done.family).toBe(false)
    expect(store.data.get('families/fam_p1/events/e1')).toBeTruthy()
    expect(store.data.get('users/p1')).toBeUndefined()
  })

  it('can run again after a partial failure', async () => {
    const store = fakeStore(family())
    const realDelete = store.deleteSignIn
    store.deleteSignIn = async () => { throw new Error('network') }
    await expect(deleteAccountData('p1', store)).rejects.toThrow('network')
    store.deleteSignIn = realDelete
    await deleteAccountData('p1', store)
    expect(store.signIns.has('p1')).toBe(false)
  })

  it('removes the old Realtime Database copy and the clinician links to it', async () => {
    const legacy = {
      users: {
        p1: { role: 'parent', familyCode: 'ABC123', careTeam: { c1: { active: true } }, mealLogs: { x: 1 } },
        c1: { role: 'clinician', patients: { p1: { code: 'ABC123' }, p9: { code: 'ZZZ999' } } },
      },
      familyCodes: { ABC123: 'p1', ZZZ999: 'p9' },
    }
    const store = fakeStore(family(), legacy)
    const done = await deleteAccountData('p1', store)
    expect(done.legacy).toBe(true)
    expect(store.tree.users.p1).toBeUndefined()
    expect(store.tree.users.c1.patients).toEqual({ p9: { code: 'ZZZ999' } })
    expect(store.tree.familyCodes).toEqual({ ZZZ999: 'p9' })
  })
})

describe('ids the person could have written', () => {
  it('skips family codes and family-list keys that are not plain ids', async () => {
    const docs = family()
    docs['users/p1/private/settings'] = { familyCode: '../families/fam_p9' }
    docs['users/p1'] = { families: { fam_p1: 'caregiver', 'fam_p9/../../users/c1': 'therapist' } }
    const store = fakeStore(docs)
    const touched = []
    for (const name of ['getDoc', 'deleteDoc', 'leaveFamily']) {
      const real = store[name]
      store[name] = async (...args) => { touched.push(args.join(' ')); return real(...args) }
    }
    const done = await deleteAccountData('p1', store)
    expect(done.leftFamilies).toBe(0)
    expect(touched.some(t => t.includes('..'))).toBe(false)
    expect(store.data.get('families/fam_p9')).toBeTruthy()
  })

  it('refuses a uid that is not a plain id', async () => {
    await expect(deleteAccountData('a/../b', fakeStore({}))).rejects.toThrow('uid required')
  })
})

describe('deleting a clinician account', () => {
  it('switches off their memberships but keeps the families\' records', async () => {
    const store = fakeStore(family())
    const done = await deleteAccountData('c1', store)
    expect(done).toEqual({ family: false, leftFamilies: 2, unlinked: 0, legacy: false })
    expect(store.data.get('families/fam_p1/members/c1')).toEqual({ role: 'therapist', active: false })
    expect(store.data.get('families/fam_p9/members/c1')).toEqual({ role: 'therapist', active: false })
    expect(store.data.get('families/fam_p1/clinicianNotes/n1')).toBeTruthy()
    expect(store.data.get('users/c1')).toBeUndefined()
    expect(store.signIns.has('c1')).toBe(false)
  })
})

describe('recent sign-in', () => {
  it('accepts a sign-in within five minutes and refuses an older or missing one', () => {
    const now = 1_000_000
    expect(signedInRecently({ auth_time: now - 60 }, now)).toBe(true)
    expect(signedInRecently({ auth_time: now - RECENT_SIGN_IN_SECONDS - 1 }, now)).toBe(false)
    expect(signedInRecently({}, now)).toBe(false)
  })
})

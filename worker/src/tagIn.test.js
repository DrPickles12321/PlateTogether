import { describe, it, expect } from 'vitest'
import { sendTagIn, TAG_IN_MESSAGE } from './tagIn'
import { fcmSender } from './fcm'

function fakeStore(docs) {
  const data = new Map(Object.entries(docs))
  return {
    data,
    getDoc: async p => data.get(p) ?? null,
    listDocs: async coll => [...data.keys()].filter(p => p.startsWith(`${coll}/`) && !p.slice(coll.length + 1).includes('/')).map(p => ({ id: p.split('/').pop(), ...data.get(p) })),
    removeMapKey: async (p, field, key) => { const d = data.get(p); const next = { ...d[field] }; delete next[key]; data.set(p, { ...d, [field]: next }) },
  }
}
const family = () => ({
  'families/fam_p1/members/p1': { role: 'caregiver', active: true },
  'families/fam_p1/members/p2': { role: 'caregiver', active: true },
  'families/fam_p1/members/p3': { role: 'caregiver', active: true },
  'families/fam_p1/members/p4': { role: 'caregiver', active: false },
  'families/fam_p1/members/c1': { role: 'therapist', active: true },
  'families/fam_p1/revoked/p3': { at: 1 },
  'users/p2/private/push': { tokens: { tokA: {}, tokOld: {} } },
  'users/p3/private/push': { tokens: { tokRevoked: {} } },
  'users/p4/private/push': { tokens: { tokInactive: {} } },
  'users/c1/private/push': { tokens: { tokClin: {} } },
})

describe('tag-in pushes', () => {
  it('notifies only the other active caregivers, with the generic message, and drops dead tokens', async () => {
    const store = fakeStore(family())
    const sent = []
    const push = { send: async (token, data) => { sent.push([token, data]); return token === 'tokOld' ? 'gone' : 'ok' } }
    const res = await sendTagIn({ callerUid: 'p1', familyId: 'fam_p1', store, push })
    expect(res).toEqual({ asked: 1, sent: 1 })
    expect(sent.map(s => s[0]).sort()).toEqual(['tokA', 'tokOld'])
    expect(sent[0][1]).toEqual(TAG_IN_MESSAGE)
    expect(Object.keys(store.data.get('users/p2/private/push').tokens)).toEqual(['tokA'])
  })

  it('refuses a caller who is not an active caregiver of that family', async () => {
    const push = { send: async () => 'ok' }
    for (const callerUid of ['c1', 'p3', 'p4', 'stranger']) {
      expect(await sendTagIn({ callerUid, familyId: 'fam_p1', store: fakeStore(family()), push })).toEqual({ error: 'not a caregiver' })
    }
    expect(await sendTagIn({ callerUid: 'p1', familyId: '../x', store: fakeStore(family()), push })).toEqual({ error: 'bad request' })
  })

  it('says nothing about meals or the child', () => {
    expect(JSON.stringify(TAG_IN_MESSAGE)).not.toMatch(/meal|dinner|lunch|breakfast|eat|food|child|hard/i)
  })
})

describe('FCM sender', () => {
  const sender = status => fcmSender({ projectId: 'demo', getToken: async () => 't', fetchImpl: async (url, init) => { sender.last = { url, init }; return new Response(JSON.stringify(status === 400 ? { error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } } : {}), { status }) } })
  it('sends a data message and reads the result', async () => {
    expect(await sender(200).send('tok', { title: 'x' })).toBe('ok')
    const body = JSON.parse(sender.last.init.body)
    expect(body.message).toEqual({ token: 'tok', webpush: { headers: { Urgency: 'high', TTL: '1800' }, data: { title: 'x' } } })
    expect(await sender(404).send('tok', {})).toBe('gone')
    expect(await sender(400).send('tok', {})).toBe('gone')
    expect(await sender(500).send('tok', {})).toBe('error')
  })
})

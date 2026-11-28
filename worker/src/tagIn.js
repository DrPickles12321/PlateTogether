// Tag-in pushes (roadmap C3). The caller asks the family's other caregivers to come; each phone they turned
// notifications on for gets one generic notification. `store` is googleStore (or a fake in tests); `push` is
// fcmSender. Tokens a phone no longer has are removed so they aren't tried again.
import { isPlainId } from './accountDeletion'

// Never meal, child or family details: Firebase Cloud Messaging is outside Google's BAA, and a lock screen is
// public. The app shows what's going on once opened.
export const TAG_IN_MESSAGE = {
  title: 'Plate Together',
  body: 'Someone in your family is asking for you.',
  url: '/parent/next',
}

export async function sendTagIn({ callerUid, familyId, store, push }) {
  if (!isPlainId(callerUid) || !isPlainId(familyId)) return { error: 'bad request' }
  const base = `families/${familyId}`
  const [me, members, revoked] = await Promise.all([
    store.getDoc(`${base}/members/${callerUid}`),
    store.listDocs(`${base}/members`),
    store.listDocs(`${base}/revoked`),
  ])
  const gone = new Set(revoked.map(r => r.id))
  if (me?.role !== 'caregiver' || me.active !== true || gone.has(callerUid)) return { error: 'not a caregiver' }

  const others = members.filter(m => m.id !== callerUid && m.role === 'caregiver' && m.active === true && !gone.has(m.id) && isPlainId(m.id))
  let sent = 0
  for (const m of others) {
    const tokens = Object.keys((await store.getDoc(`users/${m.id}/private/push`))?.tokens || {})
    for (const token of tokens) {
      const result = await push.send(token, TAG_IN_MESSAGE)
      if (result === 'ok') sent++
      else if (result === 'gone') await store.removeMapKey(`users/${m.id}/private/push`, 'tokens', token)
    }
  }
  return { asked: others.length, sent }
}

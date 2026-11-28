// Inviting another caregiver into a family (roadmap B6). An invite is a document invites/{code}:
// { familyId, role, createdBy, expiresAt, usedBy? }. firestore.rules lets the joiner use it once, before it
// expires, and only to join with the role it names. Pure helpers here; the writes are in lib/accounts.js
// (joining) and FirestoreDataProvider (creating).

export const INVITE_DAYS = 7
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L

// 10 characters from 31: about 8 * 10^14 codes, so an invite can't be guessed in the week it lasts.
export function newInviteCode(random = n => crypto.getRandomValues(new Uint8Array(n))) {
  return Array.from(random(10), b => ALPHABET[b % ALPHABET.length]).join('')
}

export const isInviteCode = code => typeof code === 'string' && /^[A-Z0-9]{10}$/.test(code)

export function inviteExpiry(nowMs = Date.now()) {
  return nowMs + INVITE_DAYS * 86400000
}

export function inviteLink(code, origin) {
  return `${origin}/parent/join/${code}`
}

const millis = t => (t == null ? NaN : typeof t === 'number' ? t : typeof t.toMillis === 'function' ? t.toMillis() : Date.parse(t))

// What the join screen should say about an invite: 'missing' | 'expired' | 'used' | 'yours' (this person
// already used it) | 'joined' (already in that family) | 'ok'.
export function inviteState(invite, { uid, nowMs = Date.now(), families = {} } = {}) {
  if (!invite) return 'missing'
  if (invite.usedBy) return invite.usedBy === uid ? 'yours' : 'used'
  if (families[invite.familyId]) return 'joined'
  if (!(millis(invite.expiresAt) > nowMs)) return 'expired'
  return 'ok'
}

// Invites this caregiver made that are still open: not expired, and nobody has joined with them yet
// (a member's via.invite names the code they used).
export function openInvites(saved = {}, members = [], nowMs = Date.now()) {
  const used = new Set(members.map(m => m.via?.invite).filter(Boolean))
  return Object.entries(saved)
    .filter(([code, v]) => !used.has(code) && millis(v?.expiresAt) > nowMs)
    .map(([code, v]) => ({ code, expiresAt: millis(v.expiresAt) }))
    .sort((a, b) => a.expiresAt - b.expiresAt)
}

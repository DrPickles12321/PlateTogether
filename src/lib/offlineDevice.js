// What this device remembers so a parent can log meals offline (roadmap C4). Pure functions over a
// Storage-like object, so they are testable and never throw when storage is blocked (private browsing).
//
// - The signed-in person's role, so an offline reload doesn't sign them out when the role can't be read.
// - Whether to keep the family's record on this device (Firestore's offline storage). Only after a parent
//   has signed in here: clinicians' devices never hold families' records, and a shared computer that has
//   never had a parent sign in keeps nothing. Both are cleared on sign-out (lib/signOut.js).

const ROLE_KEY = 'pt_role'
const OFFLINE_KEY = 'pt_offline_device'

function read(storage, key) {
  try { return storage?.getItem(key) ?? null } catch { return null }
}
function write(storage, key, value) {
  try { value === null ? storage?.removeItem(key) : storage?.setItem(key, value) } catch { /* storage blocked */ }
}

export function keepsRecordOnDevice(storage) {
  return read(storage, OFFLINE_KEY) === '1'
}

export function rememberRole(storage, uid, role) {
  if (!uid || (role !== 'parent' && role !== 'clinician')) return
  write(storage, ROLE_KEY, JSON.stringify({ uid, role }))
  write(storage, OFFLINE_KEY, role === 'parent' ? '1' : null)
}

// The role remembered for this person, or null (another person, nothing remembered, or unreadable).
export function rememberedRole(storage, uid) {
  try {
    const saved = JSON.parse(read(storage, ROLE_KEY) || 'null')
    return saved && saved.uid === uid && (saved.role === 'parent' || saved.role === 'clinician') ? saved.role : null
  } catch {
    return null
  }
}

export function forgetDevice(storage) {
  write(storage, ROLE_KEY, null)
  write(storage, OFFLINE_KEY, null)
}

export function browserStorage() {
  try { return typeof window !== 'undefined' ? window.localStorage : null } catch { return null }
}

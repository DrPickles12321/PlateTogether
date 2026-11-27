// Reading a signed-in person's role and setting up a new account, on whichever database is active
// (lib/backend.js). Used by AuthContext and LoginScreen.
import { ref, get, set } from 'firebase/database'
import { doc, getDoc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db, fsdb } from '../firebase'
import { onFirestore } from './backend'
import { familyIdFor } from './firestoreViews'
import { DEFAULT_TARGETS } from '../contexts/dataContext'

// 'parent' | 'clinician' | null (a brand-new account whose records aren't written yet).
export async function readRole(uid) {
  if (!onFirestore) return (await get(ref(db, `users/${uid}/role`))).val() || null
  const snap = await getDoc(doc(fsdb, `users/${uid}`))
  const type = snap.data()?.accountType
  return type === 'family' ? 'parent' : type === 'clinician' ? 'clinician' : null
}

// Writes a new account's records. A parent also gets a family and a family code to share.
export async function createAccountRecords({ uid, email, role, consentVersion, familyCode }) {
  const consent = { agreedAt: new Date().toISOString(), version: consentVersion }
  if (!onFirestore) {
    const writes = {
      [`users/${uid}/role`]: role,
      [`users/${uid}/email`]: email,
      [`users/${uid}/nutritionalTargets`]: DEFAULT_TARGETS,
      [`users/${uid}/consent`]: consent,
    }
    if (role === 'parent') {
      writes[`users/${uid}/familyCode`] = familyCode
      writes[`familyCodes/${familyCode}`] = uid
    }
    await Promise.all(Object.entries(writes).map(([path, val]) => set(ref(db, path), val)))
    return
  }

  // Firestore, in the order the rules need: the account first, then the family and its first caregiver
  // together, then the code (which the rules only let a caregiver create). The family goes on the account
  // last: the app starts reading a family only once it is listed there, so it never reads one half made.
  const isParent = role === 'parent'
  const fid = familyIdFor(uid)
  await setDoc(doc(fsdb, `users/${uid}`), { email, accountType: isParent ? 'family' : 'clinician', families: {} })
  await setDoc(doc(fsdb, `users/${uid}/private/settings`), { consent, ...(isParent ? { familyCode } : {}) })
  if (!isParent) return
  const batch = writeBatch(fsdb)
  batch.set(doc(fsdb, `families/${fid}`), { createdBy: uid, createdAt: serverTimestamp(), program: 'anorexia-fbt' })
  batch.set(doc(fsdb, `families/${fid}/members/${uid}`), { role: 'caregiver', active: true, addedAt: serverTimestamp(), addedBy: uid, email })
  await batch.commit()
  await setDoc(doc(fsdb, `familyCodes/${familyCode}`), { familyId: fid, createdBy: uid })
  await setDoc(doc(fsdb, `users/${uid}`), { families: { [fid]: 'caregiver' } }, { merge: true })
}

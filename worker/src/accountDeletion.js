// Deleting an account on Firestore (roadmap B5). The family record is append-only in firestore.rules, so the
// app can't erase it; this runs in the Worker with admin rights instead. `store` does the reads and writes
// (googleStore.js in production, a fake in tests), so the decisions here are plain and testable.
//
// What goes:
// - The family, with everything under it, only if the person asking created it. Its family code goes with it,
//   and it is taken off every member's family list so no clinician is left pointing at nothing.
// - Their own account documents, then the sign-in account last, so a failed run can simply be repeated.
// - The old Realtime Database copy of the same account, so a later migration run can't bring it back.
// What stays: a clinician's notes and records in a family they belonged to. Those are part of the family's
// record, so the clinician's membership is only switched off and their email removed from it.

export const familyIdFor = uid => `fam_${uid}`

// Family codes and family-list keys come from documents the person can write. They become URL paths in
// googleStore, so anything but a plain id (a "/" or "..") is skipped rather than followed.
export const isPlainId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id)

export async function deleteAccountData(uid, store) {
  if (!isPlainId(uid)) throw new Error('uid required')
  const fid = familyIdFor(uid)
  const [family, userDoc, settings] = await Promise.all([
    store.getDoc(`families/${fid}`),
    store.getDoc(`users/${uid}`),
    store.getDoc(`users/${uid}/private/settings`),
  ])
  const done = { family: false, leftFamilies: 0, unlinked: 0, legacy: false }

  if (family && family.createdBy === uid) {
    const members = await store.listDocs(`families/${fid}/members`)
    for (const m of members) {
      if (m.id === uid || !isPlainId(m.id)) continue
      await store.removeMapKey(`users/${m.id}`, 'families', fid)
      done.unlinked++
    }
    const code = settings?.familyCode
    if (isPlainId(code)) {
      const codeDoc = await store.getDoc(`familyCodes/${code}`)
      if (codeDoc?.familyId === fid) await store.deleteDoc(`familyCodes/${code}`)
    }
    await store.deleteTree(`families/${fid}`)
    done.family = true
  }

  for (const otherFid of Object.keys(userDoc?.families || {})) {
    if (otherFid === fid || !isPlainId(otherFid)) continue
    await store.leaveFamily(otherFid, uid)
    done.leftFamilies++
  }

  await store.deleteTree(`users/${uid}`)

  if (store.legacy) {
    const old = await store.legacy.get(`users/${uid}`)
    if (old) {
      for (const clinicianUid of Object.keys(old.careTeam || {}).filter(isPlainId)) {
        await store.legacy.remove(`users/${clinicianUid}/patients/${uid}`)
      }
      if (isPlainId(old.familyCode) && (await store.legacy.get(`familyCodes/${old.familyCode}`)) === uid) {
        await store.legacy.remove(`familyCodes/${old.familyCode}`)
      }
      await store.legacy.remove(`users/${uid}`)
      done.legacy = true
    }
  }

  await store.deleteSignIn(uid)
  return done
}

// Deleting needs a fresh sign-in, as Firebase asks for when the app deletes an account itself, so a
// phone left signed in for weeks can't erase a family with one tap.
export const RECENT_SIGN_IN_SECONDS = 5 * 60
export function signedInRecently(payload, nowSeconds = Math.floor(Date.now() / 1000)) {
  const at = Number(payload?.auth_time)
  return Number.isFinite(at) && nowSeconds - at <= RECENT_SIGN_IN_SECONDS
}

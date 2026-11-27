// Which family a clinician has open. The choice is stored together with the uid that made it,
// so it can never carry over to the next person who signs in on the same tab. (It once did,
// and the care-team repair step wrote a parent into their own care team.)
//
// `stored` is the last choice this clinician made on this device (sessionStorage), so a reload
// or a deep link keeps the family open. It only counts while that family is still linked.
export function resolveViewingPatient({ viewing, uid, patients = [], stored = null }) {
  if (!uid) return null
  if (viewing?.owner === uid) return viewing.patient || null
  if (stored && stored !== uid && patients.some(p => p.uid === stored)) return stored
  return null
}

export function viewingStorageKey(uid) {
  return `plate.viewingPatient.${uid}`
}

// Care-team entries the parent should see: never their own account.
export function visibleCareTeam(careTeam = [], uid) {
  return careTeam.filter(c => c && c.uid !== uid)
}

// Turns Firestore family documents into the shapes the screens already use, so the Firestore data layer
// (contexts/FirestoreDataProvider.jsx) can offer exactly the same values as the Realtime Database one.
// Pure: inputs are plain document data ({ id, ...fields }), never Firestore objects.

import { orderEvents, toMillis } from './events.js'

export const familyIdFor = parentUid => `fam_${parentUid}`
export const parentUidFor = familyId => (familyId?.startsWith('fam_') ? familyId.slice(4) : null)

export const isoOf = at => {
  const ms = toMillis(at)
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

// The care plan as the screens read it (lib/carePlan.js normalizeCarePlan takes this).
export function carePlanFromPlan(plan = {}) {
  const lines = plan.tableLines, steps = plan.refusalSteps
  if (!lines && !steps) return null
  const newest = [lines, steps].filter(Boolean).sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))[0]
  return {
    tableReminders: lines?.body || [],
    refusalSteps: steps?.body || [],
    updatedAt: isoOf(newest.updatedAt),
    updatedBy: newest.updatedBy || null,
  }
}

// The next version of a plan item. The caller adds `updatedAt` as a server timestamp.
export function nextPlanItem(current, kind, body, uid) {
  return {
    kind,
    body,
    ownerRole: current?.ownerRole || 'therapist',
    version: (current?.version || 0) + 1,
    updatedBy: uid,
  }
}

// Support requests from sos.open / sos.resolve events, as the screens read them.
export function sosFromEvents(events = []) {
  const byId = new Map()
  for (const e of orderEvents(events)) {
    if (e.type === 'sos.open') {
      byId.set(e.ref, { id: e.ref, createdAt: isoOf(e.at), note: e.value?.note || '', status: 'open' })
    } else if (e.type === 'sos.resolve' && byId.has(e.ref)) {
      byId.set(e.ref, { ...byId.get(e.ref), status: 'acknowledged', response: { body: e.value?.body || '', at: isoOf(e.at) } })
    }
  }
  return [...byId.values()]
}

// Clinicians a parent can see and remove, as CareTeamCard reads them.
export function careTeamFromMembers(members = []) {
  return members
    .filter(m => m.role !== 'caregiver' && m.role !== 'teen')
    .map(m => ({ uid: m.id, role: m.role, active: m.active !== false, addedAt: isoOf(m.addedAt), clinicianEmail: m.email || 'A clinician' }))
}

// The family a caregiver account logs into (roadmap B6). A family account is a caregiver of the family it
// created (fam_{uid}) or of one it joined by invite; a joined family wins, because joining someone else's
// family is the deliberate step (an empty own family is usually left over from signing up first).
export function caregiverFamilyOf(userData, uid) {
  const fids = Object.entries(userData?.families || {}).filter(([, role]) => role === 'caregiver').map(([fid]) => fid).sort()
  return fids.find(fid => fid !== familyIdFor(uid)) || fids.find(fid => fid === familyIdFor(uid)) || null
}

// The family's caregivers for the Account page, the one who set the family up first, then by when they joined.
export function caregiversFromMembers(members = [], { uid, createdBy } = {}) {
  return members
    .filter(m => m.role === 'caregiver' && m.active !== false)
    .map(m => ({
      uid: m.id, email: m.email || null, isYou: m.id === uid, isCreator: m.id === createdBy,
      household: m.household === 'second' ? 'second' : 'main', addedAt: isoOf(m.addedAt),
    }))
    .sort((a, b) => (b.isCreator - a.isCreator) || (a.addedAt || '').localeCompare(b.addedAt || ''))
}

// How a meal's logger is named to the other caregiver: "you", or the start of their email.
export function loggerName(loggedBy, { uid, caregivers = [] } = {}) {
  if (!loggedBy) return null
  if (loggedBy === uid) return 'you'
  const email = caregivers.find(c => c.uid === loggedBy)?.email
  return email ? email.split('@')[0] : 'another caregiver'
}

// The first caregiver's email, used as a family's name until the parent adds the child's name.
export function caregiverEmail(members = []) {
  return members.find(m => m.role === 'caregiver' && m.email)?.email || null
}

export function clinicianNotesFromDocs(docs = []) {
  return docs
    .map(d => ({ id: d.id, body: d.body, created_at: isoOf(d.at), authorUid: d.by || null }))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export function childProfileFromFamily(family) {
  if (!family) return null
  const p = family.profile || {}
  const phase = family.phase?.value
  if (!p.name && !phase) return null
  return { ...p, ...(phase ? { phase } : {}) }
}

// Families a clinician belongs to, from their own user document.
export function patientsFromUserDoc(userDoc) {
  return Object.entries(userDoc?.families || {})
    .filter(([, role]) => role && role !== 'caregiver' && role !== 'teen')
    .map(([familyId]) => ({ uid: parentUidFor(familyId), familyId }))
    .filter(p => p.uid)
}

// The date of this clinician's latest session mark, or null.
export function latestSessionDate(sessions = [], uid) {
  const mine = sessions.filter(s => s.by === uid).map(s => toMillis(s.at)).filter(Number.isFinite)
  return mine.length ? new Date(Math.max(...mine)).toISOString().slice(0, 10) : null
}

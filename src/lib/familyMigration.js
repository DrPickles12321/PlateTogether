// Plans the one-time move from Realtime Database (users/{uid}/…) to Firestore (families/…), roadmap B4.
// Pure: takes the whole `users` tree, returns every document to write. scripts/migrate-to-firestore.mjs
// reads the data, prints counts only (no names, emails or health data) and writes when told to.
//
// Mapping (docs/plans/2026-11-27-fbt-framework.md, section 7):
// - each parent becomes a family `fam_{parentUid}` (deterministic, so a re-run overwrites, never duplicates);
// - the parent is its caregiver; every linked clinician is a therapist member, inactive if the parent removed
//   them, with a revoked marker if the parent revoked them;
// - meals, times, supplements and parent notes become events (lib/events.js legacyToEvents); support
//   requests become sos.open / sos.resolve events;
// - the care plan, targets, supplements, challenge foods and the nutrition switch become plan items;
// - foods, usual meals and clinicians' notes move as they are; personal settings go to users/{uid}/private.

import { legacyToEvents, buildFamilyState, legacyViews, MEALS } from './events.js'
import { DEFAULT_PROGRAM } from './programs.js'

const toDate = v => {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
const asList = v => (Array.isArray(v) ? v.filter(Boolean) : v && typeof v === 'object' ? Object.values(v) : [])
const compact = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null))
const pad = n => String(n).padStart(5, '0')

export const familyIdFor = parentUid => `fam_${parentUid}`

export function planMigration(users = {}, { now = new Date() } = {}) {
  const families = []
  const userDocs = {}
  const familyCodes = {}
  const skipped = []

  const ensureUser = (uid, accountType, email) => {
    userDocs[uid] ??= { doc: compact({ email, accountType, families: {} }), private: {} }
    return userDocs[uid]
  }

  for (const [uid, u] of Object.entries(users)) {
    if (u?.role === 'clinician') {
      const entry = ensureUser(uid, 'clinician', u.email)
      if (u.hiddenParentNoteIds) entry.private.hiddenParentNoteIds = u.hiddenParentNoteIds
    } else if (u?.role !== 'parent') {
      skipped.push(uid)
    }
  }

  for (const [parentUid, u] of Object.entries(users)) {
    if (u?.role !== 'parent') continue
    const familyId = familyIdFor(parentUid)

    const cp = u.childProfile || {}
    const family = { createdBy: parentUid, createdAt: now, program: DEFAULT_PROGRAM }
    if (cp.name) family.profile = compact({ name: cp.name, birthYear: cp.birthYear, treatmentStart: cp.treatmentStart })
    if ([1, 2, 3].includes(cp.phase)) family.phase = { value: cp.phase, since: null, setBy: null }

    const members = { [parentUid]: { role: 'caregiver', active: true, addedAt: now, addedBy: parentUid } }
    const revoked = {}
    const sessions = {}

    const clinicianUids = new Set(Object.keys(u.careTeam || {}))
    for (const [cUid, c] of Object.entries(users)) {
      if (c?.role === 'clinician' && c.patients?.[parentUid]) clinicianUids.add(cUid)
    }
    for (const cUid of clinicianUids) {
      const link = u.careTeam?.[cUid] || {}
      const theirs = users[cUid]?.patients?.[parentUid] || {}
      const isRevoked = !!u.revokedClinicians?.[cUid]
      members[cUid] = {
        role: 'therapist',
        active: !isRevoked && link.active !== false,
        addedAt: toDate(link.addedAt) || toDate(theirs.addedAt) || now,
        addedBy: cUid,
      }
      if (isRevoked) revoked[cUid] = { at: now }
      if (theirs.lastSessionAt) sessions[`legacy-${cUid}`] = { kind: 'session', by: cUid, at: toDate(`${theirs.lastSessionAt}T12:00:00Z`) }
      ensureUser(cUid, 'clinician', users[cUid]?.email).doc.families[familyId] = 'therapist'
    }

    const events = legacyToEvents(u, parentUid).map(e => ({ ...e, at: toDate(e.at) }))
    for (const [sosId, s] of Object.entries(u.sos || {})) {
      const opened = toDate(s?.createdAt)
      if (!opened) continue
      const date = s.createdAt.slice(0, 10)
      events.push({ type: 'sos.open', date, value: { note: s.note || '' }, ref: sosId, by: parentUid, at: opened, v: 1, legacy: true })
      if (s.status && s.status !== 'open') {
        events.push({ type: 'sos.resolve', date, value: { body: s.response?.body || '' }, ref: sosId, by: null, at: toDate(s.response?.at), v: 1, legacy: true })
      }
    }
    const eventDocs = Object.fromEntries(events.map((e, i) => [`legacy-${pad(i)}`, e]))

    const plan = {}
    const item = (kind, body, meta = {}) => {
      plan[kind] = { kind, body, ownerRole: 'therapist', version: 1, updatedAt: toDate(meta.updatedAt) || now, updatedBy: meta.updatedBy || null }
    }
    if (u.carePlan) {
      item('tableLines', asList(u.carePlan.tableReminders), u.carePlan)
      item('refusalSteps', asList(u.carePlan.refusalSteps), u.carePlan)
    }
    if (u.nutritionalTargets) item('targets', u.nutritionalTargets)
    if (u.prescribedSupplements) item('supplements', asList(u.prescribedSupplements))
    if (u.assignedChallenges) {
      item('challenges', Object.entries(u.assignedChallenges).map(([id, c]) => compact({ id, name: c?.name, createdAt: c?.createdAt })))
    }
    if (u.nutritionDisplay) item('nutritionDisplay', { showToParent: !!u.nutritionDisplay.showToParent }, u.nutritionDisplay)

    const foods = Object.fromEntries(asList(u.foodItems).filter(f => f?.id).map(f => [f.id, f]))
    const usualMeals = { ...(u.usualMeals || {}) }
    const clinicianNotes = Object.fromEntries(Object.entries(u.clinicianNotes || {}).filter(([, n]) => n?.body).map(([id, n]) => [
      id, { body: n.body, by: n.authorUid || null, at: toDate(n.created_at) || now },
    ]))

    if (u.familyCode) familyCodes[u.familyCode] = { familyId, createdBy: parentUid }

    const parent = ensureUser(parentUid, 'family', u.email)
    parent.doc.families[familyId] = 'caregiver'
    parent.private = compact({
      consent: u.consent,
      hiddenClinicianNoteIds: u.hiddenClinicianNoteIds,
      clinicianNotesRead: u.clinicianNotesRead,
      savedClinicianNotes: u.savedClinicianNotes,
      insights: u.insights,
      lastResetWeek: u.lastResetWeek,
    })

    families.push({ familyId, parentUid, family, members, revoked, sessions, events: eventDocs, plan, foods, usualMeals, clinicianNotes })
  }

  return { families, userDocs, familyCodes, skipped }
}

// Counts only, safe to print: no names, emails or health data.
export function summarize({ families, userDocs, familyCodes, skipped }) {
  const sum = key => families.reduce((n, f) => n + Object.keys(f[key]).length, 0)
  return {
    families: families.length,
    users: Object.keys(userDocs).length,
    familyCodes: Object.keys(familyCodes).length,
    members: sum('members'),
    revoked: sum('revoked'),
    events: sum('events'),
    planItems: sum('plan'),
    foods: sum('foods'),
    usualMeals: sum('usualMeals'),
    clinicianNotes: sum('clinicianNotes'),
    skippedUsers: skipped.length,
  }
}

// Checks one migrated family against the parent's original data: what the screens show must be the same.
// Returns a list of differences (empty when it matches). Messages name dates and meals, never content.
export function verifyFamily(legacyUser, migratedEvents) {
  const got = legacyViews(buildFamilyState(migratedEvents))
  const want = legacyViews(buildFamilyState(legacyToEvents(legacyUser, 'check')))
  const problems = []
  const dates = new Set([...Object.keys(got.fbMealData), ...Object.keys(want.fbMealData)])
  for (const date of dates) {
    for (const meal of MEALS) {
      const a = got.fbMealData[date]?.[meal], b = want.fbMealData[date]?.[meal]
      if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) problems.push(`meal ${date} ${meal}`)
    }
  }
  if (JSON.stringify(got.mealTimesByDate) !== JSON.stringify(want.mealTimesByDate)) problems.push('meal times')
  if (JSON.stringify(got.supplementLog) !== JSON.stringify(want.supplementLog)) problems.push('supplements')
  const notes = v => Object.fromEntries(Object.entries(v.parentNotesByDate).map(([d, n]) => [d, [n.id, n.body]]))
  if (JSON.stringify(notes(got)) !== JSON.stringify(notes(want))) problems.push('parent notes')
  return problems
}

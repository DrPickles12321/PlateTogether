// The data layer on Firestore (roadmap B5). It offers exactly the values and functions of the Realtime
// Database layer in FirebaseDataContext.jsx, so screens don't change. Only used when lib/backend.js says
// 'firestore'. Shape and access rules: docs/plans/2026-11-27-fbt-framework.md section 7 and firestore.rules.
//
// Each family lives at families/fam_{parentUid}; a clinician's "patient uid" is still the parent's uid.
// Meals, notes, supplements and support requests are append-only events (lib/events.js); everything the
// screens read is worked out from them (buildFamilyState + legacyViews) and lib/firestoreViews.js.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  doc, collection, query, where, onSnapshot, getDoc, setDoc, updateDoc, deleteDoc, addDoc, writeBatch,
  serverTimestamp, deleteField,
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { fsdb, auth } from '../firebase'
import { requestAccountDeletion } from '../lib/accountDeletion'
import { useAuth } from './AuthContext'
import { FirebaseDataContext, DEFAULT_TARGETS } from './dataContext'
import { buildEvent, buildFamilyState, legacyViews } from '../lib/events'
import {
  familyIdFor, isoOf, carePlanFromPlan, nextPlanItem, sosFromEvents, careTeamFromMembers, caregiverEmail,
  clinicianNotesFromDocs, childProfileFromFamily, patientsFromUserDoc, latestSessionDate,
} from '../lib/firestoreViews'
import { fetchFoodInfo, hasFoodProxy, lookupForBackfill } from '../lib/foodData'
import { foodsNeedingNutrition, backfillPatch, BACKFILL_PER_VISIT } from '../lib/nutritionBackfill'
import { quickLogPatch } from '../lib/quickLog'
import { resolveViewingPatient, viewingStorageKey, visibleCareTeam } from '../lib/viewingPatient'
import { normalizeCarePlan } from '../lib/carePlan'
import { buildUsualMeal } from '../lib/usualMeals'
import { getWeekIsoDates } from '../lib/insights'
import { localIsoDate } from '../lib/constants'

const READ = { serverTimestamps: 'estimate' } // a just-written event sorts as "now", not first
const listOf = snap => snap.docs.map(d => ({ id: d.id, ...d.data(READ) }))
const byId = list => Object.fromEntries(list.map(x => [x.id, x]))
const compact = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''))
const warn = what => err => console.warn(`${what} not saved:`, err?.code || err?.message || 'error') // never the content

const EMPTY_RECORD = { family: null, events: [], foods: [], usualMeals: {}, plan: {}, clinicianNotes: [], members: [], revoked: [], denied: false }

// Live copy of one family's record. Keyed by family (and a retry counter), so switching families never
// shows the previous family's data.
function useFamilyRecord(fid, { nonce = 0, withRevoked = false } = {}) {
  const key = fid ? `${fid}:${nonce}` : null
  const [state, setState] = useState({ key: null, ...EMPTY_RECORD })
  useEffect(() => {
    if (!fid) return
    const k = `${fid}:${nonce}`
    const put = patch => setState(prev => ({ ...(prev.key === k ? prev : { key: k, ...EMPTY_RECORD }), ...patch }))
    const denied = err => { if (err?.code === 'permission-denied') put({ denied: true }) }
    const base = `families/${fid}`
    const unsubs = [
      onSnapshot(doc(fsdb, base), s => put({ family: s.exists() ? s.data(READ) : null }), denied),
      onSnapshot(collection(fsdb, `${base}/events`), s => put({ events: listOf(s), denied: false }), denied),
      onSnapshot(collection(fsdb, `${base}/foods`), s => put({ foods: listOf(s) }), denied),
      onSnapshot(collection(fsdb, `${base}/usualMeals`), s => put({ usualMeals: byId(listOf(s)) }), denied),
      onSnapshot(collection(fsdb, `${base}/plan`), s => put({ plan: byId(listOf(s)) }), denied),
      onSnapshot(collection(fsdb, `${base}/clinicianNotes`), s => put({ clinicianNotes: listOf(s) }), denied),
      onSnapshot(collection(fsdb, `${base}/members`), s => put({ members: listOf(s) }), denied),
    ]
    if (withRevoked) unsubs.push(onSnapshot(collection(fsdb, `${base}/revoked`), s => put({ revoked: listOf(s) }), () => {}))
    return () => unsubs.forEach(u => u())
  }, [fid, nonce, withRevoked])
  return state.key === key ? state : { key, ...EMPTY_RECORD }
}

export default function FirestoreDataProvider({ children }) {
  const { user, role } = useAuth()
  const uid = user?.uid || null
  const ownFid = uid && role === 'parent' ? familyIdFor(uid) : null

  // ── This person's own documents ─────────────────────────────────────────────
  const [userDoc, setUserDoc] = useState({ uid: null, data: null })
  const [settingsDoc, setSettingsDoc] = useState({ uid: null, data: {} })
  useEffect(() => {
    if (!uid) return
    const u1 = onSnapshot(doc(fsdb, `users/${uid}`), s => setUserDoc({ uid, data: s.data() || null }), () => {})
    const u2 = onSnapshot(doc(fsdb, `users/${uid}/private/settings`), s => setSettingsDoc({ uid, data: s.data() || {} }), () => {})
    return () => { u1(); u2() }
  }, [uid])
  const settings = settingsDoc.uid === uid ? settingsDoc.data : {}
  const settingsRef = uid ? doc(fsdb, `users/${uid}/private/settings`) : null
  const mergeSettings = patch => (settingsRef ? setDoc(settingsRef, patch, { merge: true }).catch(warn('Setting')) : undefined)

  // Read the family only once the account lists it: a listener refused while sign-up is still creating the
  // family would stop for good (lib/accounts.js writes the family onto the account last).
  const ownListed = !!(ownFid && userDoc.uid === uid && userDoc.data?.families?.[ownFid])
  const own = useFamilyRecord(ownListed ? ownFid : null, { withRevoked: true })
  const ownState = useMemo(() => buildFamilyState(own.events), [own.events])
  const ownViews = useMemo(() => legacyViews(ownState), [ownState])

  // ── A clinician's families, with this week's meals for the list ─────────────
  const linked = useMemo(
    () => (userDoc.uid === uid && role === 'clinician' ? patientsFromUserDoc(userDoc.data) : []),
    [userDoc, uid, role],
  )
  const linkedKey = linked.map(p => p.familyId).join(',')
  const [weekRaw, setWeekRaw] = useState({})
  useEffect(() => {
    if (!uid || !linkedKey) return
    const monday = getWeekIsoDates(0)[0]
    const put = (pUid, patch) => setWeekRaw(prev => ({ ...prev, [pUid]: { ...(prev[pUid] || {}), ...patch } }))
    const ignore = () => {}
    const unsubs = linkedKey.split(',').flatMap(fid => {
      const pUid = fid.slice(4)
      const base = `families/${fid}`
      return [
        onSnapshot(doc(fsdb, base), s => put(pUid, { family: s.data() || null }), ignore),
        onSnapshot(query(collection(fsdb, `${base}/events`), where('date', '>=', monday)), s => put(pUid, { weekEvents: listOf(s) }), ignore),
        onSnapshot(query(collection(fsdb, `${base}/events`), where('type', 'in', ['note.caregiver', 'note.read', 'sos.open', 'sos.resolve'])), s => put(pUid, { noteEvents: listOf(s) }), ignore),
        onSnapshot(collection(fsdb, `${base}/members`), s => put(pUid, { members: listOf(s) }), ignore),
        onSnapshot(query(collection(fsdb, `${base}/sessions`), where('by', '==', uid)), s => put(pUid, { sessions: listOf(s) }), ignore),
      ]
    })
    return () => unsubs.forEach(u => u())
  }, [uid, linkedKey])

  const patientWeekData = useMemo(() => {
    const out = {}
    for (const p of linked) {
      const raw = weekRaw[p.uid] || {}
      out[p.uid] = {
        mealLogs: legacyViews(buildFamilyState(raw.weekEvents || [])).fbMealData,
        parentNotes: legacyViews(buildFamilyState(raw.noteEvents || [])).parentNotesByDate,
        profile: childProfileFromFamily(raw.family),
        email: caregiverEmail(raw.members || []),
        lastSessionAt: latestSessionDate(raw.sessions || [], uid),
        sosOpen: sosFromEvents(raw.noteEvents || []).some(s => s.status === 'open'),
      }
    }
    return out
  }, [linked, weekRaw, uid])

  const patients = useMemo(() => linked.map(p => ({
    uid: p.uid,
    familyId: p.familyId,
    email: patientWeekData[p.uid]?.email || 'Family',
    code: null,
    lastSessionAt: patientWeekData[p.uid]?.lastSessionAt || null,
  })), [linked, patientWeekData])
  const patientsWithOpenSos = useMemo(
    () => Object.fromEntries(Object.entries(patientWeekData).map(([k, v]) => [k, v.sosOpen])),
    [patientWeekData],
  )

  // ── Which family a clinician has open (lib/viewingPatient.js) ───────────────
  const [viewingChoice, setViewingChoice] = useState({ owner: null, patient: null })
  let storedPatient = null
  try { storedPatient = uid ? sessionStorage.getItem(viewingStorageKey(uid)) : null } catch { storedPatient = null }
  const viewingPatientUid = resolveViewingPatient({ viewing: viewingChoice, uid, patients, stored: storedPatient })
  const setViewingPatientUid = useCallback(patient => {
    setViewingChoice({ owner: uid, patient: patient || null })
    try {
      if (!uid) return
      if (patient) sessionStorage.setItem(viewingStorageKey(uid), patient)
      else sessionStorage.removeItem(viewingStorageKey(uid))
    } catch { /* storage unavailable: the choice just won't survive a reload */ }
  }, [uid])
  const viewFid = viewingPatientUid ? familyIdFor(viewingPatientUid) : null
  const [retryNonce, setRetryNonce] = useState(0)
  const view = useFamilyRecord(viewFid, { nonce: retryNonce })
  const viewState = useMemo(() => buildFamilyState(view.events), [view.events])
  const viewViews = useMemo(() => legacyViews(viewState), [viewState])

  // ── Everything the screens read ────────────────────────────────────────────
  const active = viewingPatientUid ? view : own
  const activeViews = viewingPatientUid ? viewViews : ownViews
  const activeFid = viewFid || ownFid
  const plan = active.plan
  const carePlanRaw = carePlanFromPlan(plan)
  const nutritionDisplay = plan.nutritionDisplay
    ? { ...plan.nutritionDisplay.body, updatedAt: isoOf(plan.nutritionDisplay.updatedAt), updatedBy: plan.nutritionDisplay.updatedBy }
    : null
  const savedMap = settings.savedClinicianNotes || {}
  const hiddenParentTree = Object.fromEntries(Object.entries(settings.hiddenParentNoteIds || {}).map(([p, ids]) => [p, Object.keys(ids || {})]))
  const foodItems = own.foods

  // ── Writing ────────────────────────────────────────────────────────────────
  const famDoc = fid => doc(fsdb, `families/${fid}`)

  function addEvent(fid, input) {
    if (!fid || !uid) return undefined
    const { event, error } = buildEvent(input, uid)
    if (error) { console.warn('Event not saved:', error); return undefined }
    return addDoc(collection(fsdb, `families/${fid}/events`), { ...event, at: serverTimestamp() }).catch(warn('Event'))
  }

  function writePlan(fid, kind, body, currentPlan) {
    if (!fid || !uid) return Promise.resolve()
    const next = { ...nextPlanItem(currentPlan[kind], kind, body, uid), updatedAt: serverTimestamp() }
    return setDoc(doc(fsdb, `families/${fid}/plan/${kind}`), next).then(() =>
      addDoc(collection(fsdb, `families/${fid}/planHistory`), { itemId: kind, version: next.version, body, by: uid, at: serverTimestamp() }).catch(() => {}),
    )
  }

  // Meals (the parent's own family)
  const today = () => localIsoDate()
  function setMealStatus(date, meal, status) {
    if (ownViews.mealStatuses[date]?.[meal] === status) return
    addEvent(ownFid, { type: 'meal.outcome', date, meal, value: status ?? null })
  }
  function setMealItems(date, meal, items) {
    addEvent(ownFid, { type: 'meal.foods', date, meal, value: items || [] })
  }
  function quickLogMeal(date, meal, { outcome, difficulty }) {
    const patch = quickLogPatch({ outcome, difficulty })
    if (patch.status) addEvent(ownFid, { type: 'meal.outcome', date, meal, value: patch.status })
    if (patch['distress/post'] != null) addEvent(ownFid, { type: 'meal.distress', date, meal, value: { post: patch['distress/post'] } })
  }
  function setMealDistress(date, meal, patch) {
    addEvent(ownFid, { type: 'meal.distress', date, meal, value: patch })
  }
  function updateMealTime(date, meal, value) {
    addEvent(ownFid, { type: 'meal.time', date, meal, value: value || null })
  }
  function toggleSupplement(date, nutrient) {
    const given = (ownViews.supplementLog[date] || []).includes(nutrient)
    addEvent(ownFid, { type: 'supplement.given', date, value: { name: nutrient, given: !given } })
  }

  // Hard meal mode (roadmap C1): when the calm screen opened and closed, for the debrief and session summary
  // later. `ref` ties one hard meal's start and end together.
  function startHardMeal(meal) {
    const ref = crypto.randomUUID()
    addEvent(ownFid, { type: 'hardMeal.start', date: today(), meal, ref })
    return ref
  }
  function endHardMeal(meal, ref) {
    addEvent(ownFid, { type: 'hardMeal.end', date: today(), meal, ...(ref ? { ref } : {}) })
  }
  // The debrief after a hard meal (roadmap C2). Same `ref` as the calm screen when there was one.
  function saveDebrief({ date, meal, value, ref }) {
    return addEvent(ownFid, { type: 'debrief', date, meal, value, ...(ref ? { ref } : {}) })
  }

  // The parent's notes to the care team (one per day, as today)
  function saveParentNote({ date, body, existingNoteId }) {
    const noteId = existingNoteId || ownViews.parentNotesByDate[date]?.id || crypto.randomUUID()
    addEvent(ownFid, { type: 'note.caregiver', date, value: { noteId, body } })
  }
  function deleteParentNote(noteId) {
    const date = Object.keys(ownViews.parentNotesByDate).find(d => ownViews.parentNotesByDate[d]?.id === noteId)
    if (date) addEvent(ownFid, { type: 'note.caregiver', date, value: { noteId, body: null } })
  }
  function markPatientParentNoteReadById(noteId) {
    const notes = viewViews.parentNotesByDate
    const date = Object.keys(notes).find(d => notes[d]?.id === noteId)
    if (date) addEvent(viewFid, { type: 'note.read', date, ref: noteId })
  }
  // Parents don't mark their own notes read; kept so the value list matches the other data layer.
  function markParentNoteReadById() {}

  // Notes hidden or saved on this person's own screen
  function hideParentNote(noteDate) {
    if (viewingPatientUid && noteDate) mergeSettings({ hiddenParentNoteIds: { [viewingPatientUid]: { [noteDate]: true } } })
  }
  function unhideParentNote(noteDate) {
    if (viewingPatientUid && noteDate) mergeSettings({ hiddenParentNoteIds: { [viewingPatientUid]: { [noteDate]: deleteField() } } })
  }
  function markClinicianNoteRead(note) {
    const readAt = new Date().toISOString()
    const entry = { readAt, noteCreatedAt: note.created_at, noteBody: note.body }
    mergeSettings({ clinicianNotesRead: { [note.id]: entry, [`date:${note.created_at?.slice(0, 10)}`]: { noteId: note.id, ...entry } } })
  }
  function saveClinicianNote(note) {
    if (savedMap[note.id]) return
    mergeSettings({ savedClinicianNotes: { [note.id]: { id: note.id, body: note.body, created_at: note.created_at, savedAt: new Date().toISOString() } } })
  }
  function unsaveClinicianNote(noteId) { mergeSettings({ savedClinicianNotes: { [noteId]: deleteField() } }) }
  function clearAllSavedNotes() { mergeSettings({ savedClinicianNotes: deleteField() }) }
  function hideClinicianNote(noteId) { if (noteId) mergeSettings({ hiddenClinicianNoteIds: { [noteId]: true } }) }
  function unhideClinicianNote(noteId) { if (noteId) mergeSettings({ hiddenClinicianNoteIds: { [noteId]: deleteField() } }) }

  // Clinicians' notes to the family
  function writeClinicianNote({ body, existingNoteId }) {
    if (!viewFid) return
    const ref = id => doc(fsdb, `families/${viewFid}/clinicianNotes/${id}`)
    if (existingNoteId) {
      const existing = view.clinicianNotes.find(n => n.id === existingNoteId)
      if (existing?.by && existing.by !== uid) return
      updateDoc(ref(existingNoteId), { body, by: uid, updatedAt: serverTimestamp() }).catch(warn('Note'))
    } else {
      setDoc(ref(crypto.randomUUID()), { body, by: uid, at: serverTimestamp() }).catch(warn('Note'))
    }
  }
  function deleteClinicianNote(noteId) {
    if (viewFid) deleteDoc(doc(fsdb, `families/${viewFid}/clinicianNotes/${noteId}`)).catch(warn('Note'))
  }

  // The plan, written by the family's clinicians
  function saveCarePlan({ tableReminders = [], refusalSteps = [] }) {
    const next = normalizeCarePlan({ tableReminders, refusalSteps })
    return Promise.all([
      writePlan(viewFid, 'tableLines', next.tableReminders, view.plan),
      writePlan(viewFid, 'refusalSteps', next.refusalSteps, view.plan),
    ])
  }
  function setNutritionDisplay(showToParent) { return writePlan(viewFid, 'nutritionDisplay', { showToParent: !!showToParent }, view.plan) }
  function saveNutritionalTargets(next) { writePlan(activeFid, 'targets', next, plan).catch(warn('Targets')) }
  function savePrescribedSupplements(list) { writePlan(activeFid, 'supplements', list || [], plan).catch(warn('Supplements')) }
  function addAssignedChallenge(name) {
    const clean = String(name || '').trim().slice(0, 80)
    if (!clean || !viewFid) return
    const list = view.plan.challenges?.body || []
    writePlan(viewFid, 'challenges', [...list, { id: crypto.randomUUID(), name: clean, createdAt: new Date().toISOString() }], view.plan).catch(warn('Challenge'))
  }
  function removeAssignedChallenge(id) {
    if (!viewFid || !id) return
    const list = view.plan.challenges?.body || []
    writePlan(viewFid, 'challenges', list.filter(c => c.id !== id), view.plan).catch(warn('Challenge'))
  }

  // The child's profile (parent) and treatment phase (the family's therapist)
  function saveChildProfile({ name, birthYear, treatmentStart }) {
    if (!ownFid) return Promise.resolve()
    return updateDoc(famDoc(ownFid), { profile: compact({ name, birthYear, treatmentStart }) })
  }
  function setChildPhase(phase) {
    if (!viewFid) return Promise.resolve()
    const value = phase || null
    return updateDoc(famDoc(viewFid), { phase: value ? { value, since: serverTimestamp(), setBy: uid } : deleteField() })
      .then(() => addEvent(viewFid, { type: 'phase.change', date: today(), value }))
  }
  function markSessionDone() {
    if (!viewFid || !uid) return Promise.resolve()
    return addDoc(collection(fsdb, `families/${viewFid}/sessions`), { kind: 'session', by: uid, at: serverTimestamp() })
  }

  // The family's foods and usual meals
  function addFoodItem({ name, category, group, nutrition }) {
    if (!ownFid) return null
    const id = crypto.randomUUID()
    const food = { id, name, ...(category ? { category } : {}) }
    const ref = doc(fsdb, `families/${ownFid}/foods/${id}`)
    setDoc(ref, nutrition ? { ...food, ...(group ? { group } : {}), usdaNutrition: nutrition } : food).catch(warn('Food'))
    if (!nutrition) {
      fetchFoodInfo(name)
        .then(info => {
          if (!info) return
          const patch = compact({ group: info.group, usdaNutrition: info.nutrition })
          if (Object.keys(patch).length) updateDoc(ref, patch).catch(() => {})
        })
        .catch(() => {})
    }
    return food
  }
  function deleteFoodItem(id) { if (ownFid) deleteDoc(doc(fsdb, `families/${ownFid}/foods/${id}`)).catch(warn('Food')) }
  function updateFoodItemCategory(id, category) {
    if (activeFid) updateDoc(doc(fsdb, `families/${activeFid}/foods/${id}`), { category: category || deleteField() }).catch(warn('Food type'))
  }
  function setFoodNutrition(id, nutrition) { if (ownFid) updateDoc(doc(fsdb, `families/${ownFid}/foods/${id}`), { nutrition }).catch(warn('Food')) }
  function resetFoodNutrition(id) { if (ownFid) updateDoc(doc(fsdb, `families/${ownFid}/foods/${id}`), { nutrition: deleteField() }).catch(warn('Food')) }
  async function saveUsualMeal({ name, mealType, foods }) {
    if (!ownFid) return null
    const meal = buildUsualMeal({ id: crypto.randomUUID(), name, mealType, foods })
    if (!meal) return null
    await setDoc(doc(fsdb, `families/${ownFid}/usualMeals/${meal.id}`), meal)
    return meal
  }
  function deleteUsualMeal(id) { if (ownFid && id) deleteDoc(doc(fsdb, `families/${ownFid}/usualMeals/${id}`)).catch(warn('Usual meal')) }

  // Fill in USDA data for older foods, a few per visit (lib/nutritionBackfill.js), as the other data layer does.
  const backfill = useRef({ fid: null, tried: new Set(), running: false })
  useEffect(() => {
    const state = backfill.current
    if (state.fid !== ownFid) Object.assign(state, { fid: ownFid, tried: new Set(), running: false })
    if (!ownFid || !hasFoodProxy() || state.running) return
    const slots = BACKFILL_PER_VISIT - state.tried.size
    if (slots <= 0) return
    const todo = foodsNeedingNutrition(foodItems.filter(f => !state.tried.has(f.id)), { limit: slots })
    if (!todo.length) return
    state.running = true
    ;(async () => {
      for (const food of todo) {
        if (backfill.current.fid !== ownFid) return
        state.tried.add(food.id)
        const result = await lookupForBackfill(food.name)
        if (backfill.current.fid !== ownFid) return
        if (result.status === 'error') continue
        updateDoc(doc(fsdb, `families/${ownFid}/foods/${food.id}`), backfillPatch(result.status === 'found' ? result : null)).catch(() => {})
      }
      state.running = false
    })()
  }, [ownFid, foodItems])

  // Support requests
  function sendSos({ note = '' }) {
    if (!ownFid) return null
    const id = crypto.randomUUID()
    const record = { id, createdAt: new Date().toISOString(), note: String(note).slice(0, 500), status: 'open' }
    addEvent(ownFid, { type: 'sos.open', date: today(), ref: id, value: { note: record.note } })
    return record
  }
  function acknowledgeSos(sosId, responseText) {
    addEvent(viewFid, { type: 'sos.resolve', date: today(), ref: sosId, value: { body: String(responseText || '').slice(0, 500) } })
  }

  // Linking: a clinician joins with the family code; the parent removes or restores access
  async function addPatientByCode(code) {
    if (!uid) return { error: 'Not logged in' }
    const upper = code.toUpperCase().trim()
    if (!upper) return { error: 'Enter a family code' }
    const snap = await getDoc(doc(fsdb, `familyCodes/${upper}`)).catch(() => null)
    if (!snap?.exists()) return { error: 'Family code not found' }
    const fid = snap.data().familyId
    if (patients.some(p => p.familyId === fid)) return { error: 'Patient already added' }
    try {
      await setDoc(doc(fsdb, `families/${fid}/members/${uid}`), compact({
        role: 'therapist', active: true, addedAt: serverTimestamp(), addedBy: uid, via: { familyCode: upper }, email: user?.email,
      }))
    } catch {
      return { error: 'This family has removed your access, or you left it. Ask them to invite you again.' }
    }
    await setDoc(doc(fsdb, `users/${uid}`), { families: { [fid]: 'therapist' } }, { merge: true }).catch(warn('Family list'))
    return { success: true }
  }
  function removePatient(patientUid) {
    if (!uid || !patientUid) return
    const fid = familyIdFor(patientUid)
    updateDoc(doc(fsdb, `families/${fid}/members/${uid}`), { active: false }).catch(() => {})
    setDoc(doc(fsdb, `users/${uid}`), { families: { [fid]: deleteField() } }, { merge: true }).catch(warn('Family list'))
    if (viewingPatientUid === patientUid) setViewingPatientUid(null)
  }
  function revokeCareTeamAccess(clinicianUid) {
    if (!ownFid || !clinicianUid) return
    const batch = writeBatch(fsdb)
    batch.update(doc(fsdb, `families/${ownFid}/members/${clinicianUid}`), { active: false })
    batch.set(doc(fsdb, `families/${ownFid}/revoked/${clinicianUid}`), { at: serverTimestamp() })
    batch.commit().catch(warn('Access change'))
  }
  function reEnableCareTeamAccess(clinicianUid) {
    if (!ownFid || !clinicianUid) return
    const batch = writeBatch(fsdb)
    batch.update(doc(fsdb, `families/${ownFid}/members/${clinicianUid}`), { active: true })
    batch.delete(doc(fsdb, `families/${ownFid}/revoked/${clinicianUid}`))
    batch.commit().catch(warn('Access change'))
  }

  // The record is append-only by design, so the Worker deletes the account with admin rights
  // (worker/src/accountDeletion.js). The sign-in is gone on the server, so sign out here to leave at once.
  async function deleteAccount() {
    if (!uid) return { error: 'Not signed in' }
    const res = await requestAccountDeletion(auth.currentUser)
    if (res.success) await signOut(auth).catch(() => {})
    return res
  }

  const activeParentNotesByDate = activeViews.parentNotesByDate

  return (
    <FirebaseDataContext.Provider value={{
      allMealItems: activeViews.allMealItems,
      mealStatuses: activeViews.mealStatuses,
      nutritionalTargets: viewingPatientUid ? (plan.targets?.body || null) : (plan.targets?.body || DEFAULT_TARGETS),
      saveNutritionalTargets,
      parentNotesByDate: ownViews.parentNotesByDate,
      parentNotesArray: Object.values(activeParentNotesByDate),
      saveParentNote,
      deleteParentNote,
      markParentNoteReadById,
      markPatientParentNoteReadById,
      hiddenParentNoteIds: viewingPatientUid ? (hiddenParentTree[viewingPatientUid] || []) : [],
      hideParentNote,
      unhideParentNote,
      mealTimesByDate: ownViews.mealTimesByDate,
      activeMealTimesByDate: activeViews.mealTimesByDate,
      updateMealTime,
      supplementLog: ownViews.supplementLog,
      toggleSupplement,
      startHardMeal,
      endHardMeal,
      saveDebrief,
      hardMeals: (viewingPatientUid ? viewState : ownState).hardMeals,
      clinicianNotesRead: settings.clinicianNotesRead || {},
      markClinicianNoteRead,
      savedClinicianNotes: Object.values(savedMap),
      saveClinicianNote,
      unsaveClinicianNote,
      clearAllSavedNotes,
      hiddenClinicianNoteIds: Object.keys(settings.hiddenClinicianNoteIds || {}),
      hideClinicianNote,
      unhideClinicianNote,
      clinicianNotes: clinicianNotesFromDocs(active.clinicianNotes),
      writeClinicianNote,
      deleteClinicianNote,
      setMealItems,
      setMealStatus,
      quickLogMeal,
      mealDistress: activeViews.mealDistress,
      setMealDistress,
      familyCode: settings.familyCode || null,
      patients,
      prescribedSupplements: plan.supplements?.body || [],
      savePrescribedSupplements,
      viewingPatientUid,
      setViewingPatientUid,
      patientAccessDenied: !!viewingPatientUid && view.denied,
      retryPatientAccess: () => setRetryNonce(n => n + 1),
      addPatientByCode,
      removePatient,
      deleteAccount,
      foodItems,
      usualMeals: own.usualMeals,
      saveUsualMeal,
      deleteUsualMeal,
      addFoodItem,
      deleteFoodItem,
      updateFoodItemCategory,
      setFoodNutrition,
      resetFoodNutrition,
      assignedChallenges: plan.challenges?.body || [],
      carePlan: normalizeCarePlan(carePlanRaw),
      saveCarePlan,
      nutritionDisplay,
      setNutritionDisplay,
      childProfile: viewingPatientUid ? (patientWeekData[viewingPatientUid]?.profile || null) : childProfileFromFamily(own.family),
      saveChildProfile,
      setChildPhase,
      markSessionDone,
      addAssignedChallenge,
      removeAssignedChallenge,
      careTeam: visibleCareTeam(careTeamFromMembers(own.members), uid),
      revokeCareTeamAccess,
      reEnableCareTeamAccess,
      mySos: sosFromEvents(own.events),
      sendSos,
      patientSos: sosFromEvents(view.events),
      patientsWithOpenSos,
      patientWeekData,
      acknowledgeSos,
    }}>
      {children}
    </FirebaseDataContext.Provider>
  )
}

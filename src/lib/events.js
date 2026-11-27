// The family record as append-only events (docs/plans/2026-11-27-fbt-framework.md, section 7).
// Every tap is a new event; nothing is overwritten. Screens read the latest state, worked out here.
// Pure functions only: no Firebase. firestore.rules enforces the same event types and shape on write.
//
// Event: { type, date: 'YYYY-MM-DD', meal?, value, by, at, v: 1, ref? }
//   `at` is a Firestore Timestamp, epoch milliseconds, an ISO string, or null for migrated entries whose
//   time is unknown (they sort first).

export const MEALS = ['breakfast', 'lunch', 'snack', 'dinner']
export const OUTCOMES = ['okay', 'difficult', 'refused', 'skipped']

export const CAREGIVER_EVENTS = [
  'meal.outcome', 'meal.foods', 'meal.distress', 'meal.time',
  'hardMeal.start', 'hardMeal.tagIn', 'hardMeal.end', 'debrief',
  'note.caregiver', 'supplement.given', 'sos.open',
]
export const TEAM_EVENTS = ['note.read', 'sos.resolve', 'phase.change']
const ALL_EVENTS = [...CAREGIVER_EVENTS, ...TEAM_EVENTS]
const MEAL_EVENTS = ['meal.outcome', 'meal.foods', 'meal.distress', 'meal.time', 'hardMeal.start', 'hardMeal.tagIn', 'hardMeal.end', 'debrief']

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const CLOCK = /^([01]?\d|2[0-3]):[0-5]\d$/
const NOTE_MAX = 2000
const rating = v => v === null || (Number.isInteger(v) && v >= 1 && v <= 5)

// ── Writing ──────────────────────────────────────────────────────────────────

// Checks one input and returns { event } ready to store (the caller adds `at`, a server timestamp),
// or { error } in plain words. `by` is the writer's uid.
export function buildEvent({ type, date, meal, value, ref }, by) {
  if (!ALL_EVENTS.includes(type)) return { error: `Unknown event type: ${type}` }
  if (!by) return { error: 'Missing author.' }
  if (!ISO_DATE.test(date || '')) return { error: 'Date must be YYYY-MM-DD.' }
  if (MEAL_EVENTS.includes(type) && !MEALS.includes(meal)) return { error: 'Pick breakfast, lunch, snack or dinner.' }
  if (meal != null && !MEALS.includes(meal)) return { error: 'Pick breakfast, lunch, snack or dinner.' }

  const problem = valueProblem(type, value)
  if (problem) return { error: problem }

  const event = { type, date, value: value ?? null, by, v: 1 }
  if (meal != null) event.meal = meal
  if (ref != null) event.ref = ref
  return { event }
}

function valueProblem(type, value) {
  switch (type) {
    case 'meal.outcome':
      return value === null || OUTCOMES.includes(value) ? null : 'Unknown meal outcome.'
    case 'meal.foods':
      return Array.isArray(value) && value.length <= 12 && value.every(f => f && typeof f.name === 'string' && f.name.trim())
        ? null : 'Foods must be a list of up to 12 named foods.'
    case 'meal.distress':
      return value && typeof value === 'object' && Object.keys(value).length
        && Object.entries(value).every(([k, v]) => (k === 'pre' || k === 'post') && rating(v))
        ? null : 'Distress is pre and/or post, 1 to 5 (null clears).'
    case 'meal.time':
      return value === null || CLOCK.test(value) ? null : 'Meal time must look like 18:30.'
    case 'note.caregiver':
      return value && typeof value.noteId === 'string' && (value.body === null || (typeof value.body === 'string' && value.body.length <= NOTE_MAX))
        ? null : `A note needs an id and a body of up to ${NOTE_MAX} characters (null deletes it).`
    case 'supplement.given':
      return value && typeof value.name === 'string' && value.name.trim() && typeof value.given === 'boolean'
        ? null : 'A supplement needs a name and given: true or false.'
    default:
      return null
  }
}

// ── Reading ──────────────────────────────────────────────────────────────────

export function toMillis(at) {
  if (at == null) return -Infinity
  if (typeof at === 'number') return at
  if (at instanceof Date) return at.getTime()
  if (typeof at === 'string') return Date.parse(at)
  if (typeof at.toMillis === 'function') return at.toMillis()
  if (typeof at.seconds === 'number') return at.seconds * 1000 + Math.floor((at.nanoseconds || 0) / 1e6)
  return -Infinity
}

// Oldest first. Events with an unknown time come first; ties keep their original order.
export function orderEvents(events) {
  return events
    .map((e, i) => ({ e, i, t: toMillis(e.at) }))
    .sort((a, b) => (a.t - b.t) || (a.i - b.i))
    .map(x => x.e)
}

const atOrNull = e => (e.at == null ? null : toMillis(e.at))

// The latest state of the record, plus how each meal got there.
//   meals[date][meal] = { status, items, distress, time, loggedBy, firstLoggedAt, lastChangedAt, outcomeChanges }
//   supplements[date] = [names given]
//   notes[date] = { id, date, body, by, created_at, updated_at, readBy: [uid], read_at }
export function buildFamilyState(events) {
  const meals = {}
  const supplements = {}
  const notes = {}

  const mealSlot = (date, meal) => {
    meals[date] ??= {}
    meals[date][meal] ??= { status: null, items: [], distress: null, time: null, loggedBy: null, firstLoggedAt: null, lastChangedAt: null, outcomeChanges: 0 }
    return meals[date][meal]
  }

  for (const e of orderEvents(events)) {
    const at = atOrNull(e)
    switch (e.type) {
      case 'meal.outcome': {
        const m = mealSlot(e.date, e.meal)
        if (m.status !== null && e.value !== m.status) m.outcomeChanges += 1
        m.status = e.value
        m.loggedBy = e.by
        if (m.firstLoggedAt === null) m.firstLoggedAt = at
        m.lastChangedAt = at
        break
      }
      case 'meal.foods':
        mealSlot(e.date, e.meal).items = e.value || []
        break
      case 'meal.distress': {
        const m = mealSlot(e.date, e.meal)
        const merged = { ...(m.distress || {}), ...e.value }
        for (const k of Object.keys(merged)) if (merged[k] == null) delete merged[k]
        m.distress = Object.keys(merged).length ? merged : null
        break
      }
      case 'meal.time':
        mealSlot(e.date, e.meal).time = e.value
        break
      case 'supplement.given': {
        const given = new Set(supplements[e.date] || [])
        if (e.value.given) given.add(e.value.name)
        else given.delete(e.value.name)
        supplements[e.date] = [...given]
        if (!supplements[e.date].length) delete supplements[e.date]
        break
      }
      case 'note.caregiver': {
        const { noteId, body } = e.value
        if (body === null) { delete notes[e.date]; break }
        const prev = notes[e.date]
        const sameNote = prev && prev.id === noteId
        notes[e.date] = {
          id: noteId, date: e.date, body, by: e.by,
          created_at: sameNote ? prev.created_at : at,
          updated_at: at,
          // An edited note counts as unread again, as it does today.
          readBy: [], read_at: null,
        }
        break
      }
      case 'note.read': {
        const note = Object.values(notes).find(n => n.id === e.ref)
        if (note && !note.readBy.includes(e.by)) {
          note.readBy.push(e.by)
          if (note.read_at === null) note.read_at = at
        }
        break
      }
      default:
        break
    }
  }
  return { meals, supplements, notes }
}

// The shapes the screens use today (FirebaseDataContext), so switching storage leaves screens unchanged.
export function legacyViews({ meals, supplements, notes }) {
  const fbMealData = {}, mealStatuses = {}, allMealItems = {}, mealDistress = {}, mealTimesByDate = {}
  for (const [date, byMeal] of Object.entries(meals)) {
    for (const [meal, m] of Object.entries(byMeal)) {
      fbMealData[date] ??= {}
      fbMealData[date][meal] = { items: m.items, status: m.status, distress: m.distress }
      allMealItems[date] ??= {}
      allMealItems[date][meal] = m.items
      if (m.status) { mealStatuses[date] ??= {}; mealStatuses[date][meal] = m.status }
      if (m.distress && (m.distress.pre || m.distress.post)) { mealDistress[date] ??= {}; mealDistress[date][meal] = m.distress }
      if (m.time) { mealTimesByDate[date] ??= {}; mealTimesByDate[date][meal] = m.time }
    }
  }
  const parentNotesByDate = {}
  for (const [date, n] of Object.entries(notes)) {
    parentNotesByDate[date] = {
      id: n.id, date, body: n.body,
      created_at: n.created_at == null ? null : new Date(n.created_at).toISOString(),
      read_at: n.read_at == null ? null : new Date(n.read_at).toISOString(),
    }
  }
  return { fbMealData, mealStatuses, allMealItems, mealDistress, mealTimesByDate, supplementLog: { ...supplements }, parentNotesByDate }
}

// ── Migration (roadmap B4) ─────────────────────────────────────────────────────

// Turns one parent's Realtime Database data into events. Meal times of day are unknown, so `at` is null
// and `legacy: true` marks them (written by the migration script with admin rights, not by the app).
// A note keeps its created_at; a note a clinician read gets a note.read whose author is unknown.
export function legacyToEvents({ mealLogs = {}, mealTimes = {}, supplementLog = {}, parentNotes = {} }, parentUid) {
  const out = []
  const push = (type, date, meal, value, extra = {}) => {
    const e = { type, date, value, by: parentUid, at: null, v: 1, legacy: true, ...extra }
    if (meal) e.meal = meal
    out.push(e)
  }
  for (const date of Object.keys(mealLogs).sort()) {
    for (const meal of MEALS) {
      const m = mealLogs[date]?.[meal]
      if (!m) continue
      const items = m.items ? (Array.isArray(m.items) ? m.items : Object.values(m.items)) : []
      if (m.status) push('meal.outcome', date, meal, m.status)
      if (items.length) push('meal.foods', date, meal, items)
      const d = m.distress
      if (d && (d.pre || d.post)) {
        push('meal.distress', date, meal, Object.fromEntries(Object.entries(d).filter(([k, v]) => (k === 'pre' || k === 'post') && v)))
      }
    }
  }
  for (const date of Object.keys(mealTimes).sort()) {
    for (const meal of MEALS) {
      const t = mealTimes[date]?.[meal]
      if (t) push('meal.time', date, meal, t)
    }
  }
  for (const date of Object.keys(supplementLog).sort()) {
    for (const name of supplementLog[date] || []) push('supplement.given', date, null, { name, given: true })
  }
  for (const date of Object.keys(parentNotes).sort()) {
    const n = parentNotes[date]
    if (!n?.body) continue
    push('note.caregiver', date, null, { noteId: n.id, body: n.body }, { at: n.created_at || null })
    if (n.read_at) out.push({ type: 'note.read', date, ref: n.id, value: null, by: null, at: n.read_at, v: 1, legacy: true })
  }
  return out
}

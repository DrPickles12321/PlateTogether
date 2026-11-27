// Which family needs the clinician first. Built only from what each family logged this week, so a
// clinician can see the reason next to the order. Pure, so it is easy to test.
//   mealLogs:    { [isoDate]: { [meal]: { status } } }   (this week only)
//   parentNotes: { [isoDate]: { body, read_at } }
const DAY_NAME = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })

export function familySummary({ mealLogs = {}, parentNotes = {}, sosOpen = false, weekDates = [], today = '' } = {}) {
  const past = weekDates.filter(d => !today || d <= today)
  let refused = 0, partly = 0, logged = 0
  let lastLogged = null
  for (const date of past) {
    const meals = Object.values(mealLogs[date] || {})
    const statuses = meals.map(m => m?.status).filter(Boolean)
    if (statuses.length) lastLogged = date
    logged += statuses.length
    refused += statuses.filter(s => s === 'refused').length
    partly += statuses.filter(s => s === 'difficult').length
  }
  const unread = Object.values(parentNotes || {}).filter(n => n && n.body && !n.read_at).length
  const quietDays = lastLogged ? past.filter(d => d > lastLogged).length : past.length

  const reasons = []
  if (sosOpen) reasons.push('Asked for support')
  if (refused) reasons.push(`${refused} ${refused === 1 ? 'meal' : 'meals'} not eaten this week`)
  if (unread) reasons.push(`${unread} unread ${unread === 1 ? 'note' : 'notes'}`)
  if (past.length >= 2 && quietDays >= 2) reasons.push(lastLogged ? `Nothing logged since ${DAY_NAME(lastLogged)}` : 'Nothing logged this week')

  const priority = sosOpen ? 3 : refused ? 2 : (unread || quietDays >= 2) ? 1 : 0
  return {
    sosOpen, refused, partly, unread, logged, lastLogged, priority,
    reasons,
    reason: reasons[0] || (logged ? 'A steady week' : 'Nothing logged yet'),
  }
}

// Most urgent first, then most meals not eaten, then by name.
export function sortFamilies(families = []) {
  return [...families].sort((a, b) =>
    b.summary.priority - a.summary.priority ||
    b.summary.refused - a.summary.refused ||
    String(a.name || '').localeCompare(String(b.name || '')))
}

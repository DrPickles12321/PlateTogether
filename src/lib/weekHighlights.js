// The plain sentences at the top of the parent's week. Facts in words, never a score: no
// counts of what was eaten, no percentages, no praise for a number (PRODUCT.md).
const MEALS = [
  { key: 'breakfast', plural: 'Breakfasts' },
  { key: 'lunch', plural: 'Lunches' },
  { key: 'snack', plural: 'Snacks' },
  { key: 'dinner', plural: 'Dinners' },
]

function dayName(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
}

function joinDays(days) {
  if (days.length <= 1) return days.join('')
  return `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}`
}

// dates: the week's ISO dates, Monday first. Days after `today` are ignored.
export function weekHighlights({ mealStatuses = {}, dates = [], today = '' } = {}) {
  const past = dates.filter(d => !today || d <= today)
  const hard = []
  const steady = []
  let logged = 0

  for (const meal of MEALS) {
    const statuses = past.map(d => ({ date: d, status: mealStatuses[d]?.[meal.key] || null }))
    const done = statuses.filter(s => s.status)
    logged += done.length
    const refused = done.filter(s => s.status === 'refused').map(s => dayName(s.date))
    if (refused.length) {
      hard.push({ topic: meal.plural, text: `Hard on ${joinDays(refused)}. Worth raising at your next session.` })
    } else if (done.length >= 3 && done.every(s => s.status === 'okay')) {
      steady.push({ topic: meal.plural, text: 'Steady so far this week.' })
    }
  }

  if (logged === 0) {
    return [{ topic: 'This week', text: 'Nothing written down yet. Log a meal from Next meal and it shows up here.' }]
  }
  return [...hard, ...steady].slice(0, 3)
}

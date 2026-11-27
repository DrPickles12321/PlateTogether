// Which meal the parent should see on the Next meal screen: the earliest meal today that has no
// outcome yet, by its planned time. Null when every meal today has an outcome.
export const NEXT_MEALS = [
  { key: 'breakfast', label: 'Breakfast', defaultTime: '08:00' },
  { key: 'lunch',     label: 'Lunch',     defaultTime: '13:00' },
  { key: 'snack',     label: 'Snack',     defaultTime: '15:30' },
  { key: 'dinner',    label: 'Dinner',    defaultTime: '19:00' },
]

export function pickNextMeal({ statuses = {}, times = {} } = {}) {
  const open = NEXT_MEALS
    .map(m => ({ ...m, time: times[m.key] || m.defaultTime }))
    .filter(m => !statuses[m.key])
    .sort((a, b) => a.time.localeCompare(b.time))
  return open[0] || null
}

// '18:30' -> '6:30'; '08:00' -> '8:00'. The screen says "Dinner, 6:30", so AM/PM is left out.
export function shortTime(hhmm = '') {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')}`
}

export function loggedCount(statuses = {}) {
  return NEXT_MEALS.filter(m => statuses[m.key]).length
}

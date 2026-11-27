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

// "In about 40 minutes" under the next meal's time. Empty when the time has passed or is
// more than four hours away, so the screen never nags about a meal that is late.
export function timeUntil(hhmm = '', now = new Date()) {
  if (!/^\d{1,2}:\d{2}$/.test(hhmm)) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const diff = h * 60 + m - (now.getHours() * 60 + now.getMinutes())
  if (diff <= 0 || diff >= 240) return ''
  if (diff < 10) return 'In a few minutes'
  if (diff < 60) return `In about ${Math.round(diff / 5) * 5} minutes`
  const hours = Math.round(diff / 60)
  return `In about ${hours} hour${hours === 1 ? '' : 's'}`
}

export function loggedCount(statuses = {}) {
  return NEXT_MEALS.filter(m => statuses[m.key]).length
}

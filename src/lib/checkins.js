// The weekly caregiver check-in (roadmap F2): two one-tap questions a week for each caregiver, so the care
// team sees caregiver strain over time. Stored as families/{fid}/checkins/{uid}_{YYYY-Www}:
//   { by, week, strain: 1-5 (5 = hardest), support: 1-5 (5 = most supported) }
// Each parent sees only their own; the team sees all of them (firestore.rules). Words are DRAFT (wording
// review, section 15).

export const STRAIN = [
  [1, 'Doing okay'],
  [2, 'Mostly okay'],
  [3, 'Up and down'],
  [4, 'Hard'],
  [5, 'Very hard'],
]
export const SUPPORT = [
  [1, 'Not at all'],
  [2, 'A little'],
  [3, 'Somewhat'],
  [4, 'Mostly'],
  [5, 'Very'],
]
export const strainWord = n => STRAIN.find(([v]) => v === n)?.[1] || null
export const supportWord = n => SUPPORT.find(([v]) => v === n)?.[1] || null

// ISO 8601 week of a local date, like '2026-W48' (weeks start on Monday; week 1 has the year's first Thursday).
export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// The Monday that starts an ISO week, as YYYY-MM-DD, for labels.
export function weekStart(week) {
  const [y, w] = week.split('-W').map(Number)
  const jan4 = new Date(Date.UTC(y, 0, 4))
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (w - 1) * 7)
  return monday.toISOString().slice(0, 10)
}

export const checkinId = (uid, week) => `${uid}_${week}`

// Answers that should get a gentle offer of help right away: very hard, or hard with little support.
export const needsSupportNow = ({ strain, support }) => strain === 5 || (strain >= 4 && support <= 2)

// For the clinician: each caregiver's last `weeks` check-ins, newest first, and whether strain was 4 or 5 in
// the last two weeks they answered. Missing weeks are simply missing.
export function strainByCaregiver(checkins = [], { weeks = 6 } = {}) {
  const by = new Map()
  for (const c of checkins) {
    if (!c?.by || !c.week) continue
    if (!by.has(c.by)) by.set(c.by, [])
    by.get(c.by).push(c)
  }
  return [...by.entries()].map(([uid, list]) => {
    const recent = list.sort((a, b) => b.week.localeCompare(a.week)).slice(0, weeks)
    const lastTwo = recent.slice(0, 2)
    return { uid, recent, hardTwoWeeks: lastTwo.length === 2 && lastTwo.every(c => c.strain >= 4) }
  })
}

// The child a family is caring for, as clinicians think of them: "Maya, 14, week 6, phase 1".
// The parent writes name, birth year and treatment start; only a linked clinician sets the FBT phase
// (database.rules.json: childProfile). The name is whatever the parent types, a first name or initials.

export const PHASES = {
  1: 'Phase 1: parents take charge of eating',
  2: 'Phase 2: control handed back gradually',
  3: 'Phase 3: back to everyday life',
}

export const NAME_MAX = 40

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function utcDay(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// Checks the parent's part of the profile before it is saved. Returns the cleaned value, or an error
// message in plain words. `today` is an ISO date (YYYY-MM-DD).
export function cleanProfileInput({ name, birthYear, treatmentStart }, today) {
  const cleanName = (name || '').trim().replace(/\s+/g, ' ')
  if (!cleanName) return { error: 'Add a first name or initials.' }
  if (cleanName.length > NAME_MAX) return { error: `Keep the name under ${NAME_MAX} characters.` }

  const thisYear = Number(today.slice(0, 4))
  let year = null
  if (birthYear !== '' && birthYear != null) {
    year = Number(birthYear)
    if (!Number.isInteger(year) || year < thisYear - 30 || year > thisYear) {
      return { error: 'Birth year looks wrong. Use four digits, like 2012.' }
    }
  }

  let start = null
  if (treatmentStart) {
    if (!ISO_DATE.test(treatmentStart)) return { error: 'Treatment start needs a full date.' }
    if (treatmentStart > today) return { error: 'Treatment start can’t be in the future.' }
    start = treatmentStart
  }
  return { value: { name: cleanName, birthYear: year, treatmentStart: start } }
}

// Only the birth year is stored, so the age is a range ("13–14").
export function ageText(birthYear, today) {
  if (!birthYear) return null
  const older = Number(today.slice(0, 4)) - birthYear
  if (older <= 0) return null
  return `${older - 1}–${older}`
}

export function treatmentWeek(treatmentStart, today) {
  if (!treatmentStart || !ISO_DATE.test(treatmentStart) || treatmentStart > today) return null
  return Math.floor((utcDay(today) - utcDay(treatmentStart)) / (7 * 86400000)) + 1
}

// The line under a family's name: "age 13–14 · week 6 of treatment · phase 1". Empty when nothing is known.
export function profileDetails(profile, today) {
  if (!profile) return ''
  const parts = []
  const age = ageText(profile.birthYear, today)
  if (age) parts.push(`age ${age}`)
  const week = treatmentWeek(profile.treatmentStart, today)
  if (week) parts.push(`week ${week} of treatment`)
  if (PHASES[profile.phase]) parts.push(`phase ${profile.phase}`)
  return parts.join(' · ')
}

// The name to show for a family: the child's name if the parent added one, else the parent's email.
export function familyName(profile, fallback) {
  const name = typeof profile?.name === 'string' ? profile.name.trim() : ''
  return name || fallback || 'Family'
}

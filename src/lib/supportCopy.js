// Words the app says to a parent right after a hard meal. Clinical-facing text: it lives in
// code and is reviewed like code. DRAFT, not yet reviewed by a clinician (see
// docs/plans/2026-11-26-design-pass.md for the before/after example).
//
// Rules it follows (AGENTS.md): support, never diagnose or prescribe; no numbers to aim
// for; emergencies route to 911/988, not advice. A teen may read it over a parent's shoulder.

export const HARD_MEAL = {
  title: 'That meal was hard.',
  body: "Hard meals happen in recovery. You don't have to work this out alone.",
  messageAction: 'Message your care team',
  helpAction: 'When to get help',
  dismiss: 'Close',
  emergency: 'In an emergency, or if anyone talks about suicide or self-harm:',
  notMonitored: 'Messages are not watched around the clock. In an emergency, call 911.',
  sent: 'Sent. Your care team will see it next time they open Plate Together. This is not an emergency line.',
}

// The one line at the top of the parent's week. It reflects what actually happened and never
// praises a number: no counts, no percentages, no "doing great" after a week of hard meals.
export function weekMessage({ logged = 0, hard = 0 } = {}) {
  if (logged === 0) return 'Nothing written down yet this week. Log a meal on the Today page and it will show up here.'
  if (hard > 0) return 'This week had some hard meals. That is part of recovery, and you kept going.'
  return 'You kept the notebook going this week. Bring anything on your mind to your next session.'
}

// The note attached to the care-team message, so the clinician knows which meal it was about.
export function hardMealNote({ mealLabel, dateLabel, outcomeLabel }) {
  const what = outcomeLabel ? ` (${outcomeLabel.toLowerCase()})` : ''
  return `Hard ${String(mealLabel || 'meal').toLowerCase()} on ${dateLabel}${what}.`
}

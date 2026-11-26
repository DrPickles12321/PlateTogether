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
  notMonitored: 'Messages are not watched around the clock. In an emergency, call 911.',
  sent: 'Sent. Your care team will see it next time they open Plate Together. This is not an emergency line.',
}

// The note attached to the care-team message, so the clinician knows which meal it was about.
export function hardMealNote({ mealLabel, dateLabel, outcomeLabel }) {
  const what = outcomeLabel ? ` (${outcomeLabel.toLowerCase()})` : ''
  return `Hard ${String(mealLabel || 'meal').toLowerCase()} on ${dateLabel}${what}.`
}

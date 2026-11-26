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
  planAction: 'Open your plan',
  notMonitored: 'Messages are not watched around the clock. In an emergency, call 911.',
  sent: 'Sent. Your care team will see it next time they open Plate Together. This is not an emergency line.',
}

// The screen a parent sees right after marking a meal Refused. The steps themselves come only from
// the family's clinician (carePlan.refusalSteps); without them the screen says so and points to the
// care team. Emergency numbers stay behind "When to get help": refusals are expected in recovery,
// and a teen may be reading over the parent's shoulder.
export const REFUSAL = {
  title: mealLabel => `${mealLabel} was refused.`,
  saved: "That's saved. Here is what your plan says to do now.",
  planHeading: 'If a meal is refused',
  planSource: 'Written by your clinician.',
  noPlan: "Your clinician hasn't written a plan for this yet. Ask about it at your next session, and let them know about this meal below.",
  tellHeading: 'Tell your clinician',
  addLine: 'Add a line (optional)',
  send: 'Send to your clinician',
  done: 'Done for now',
  worried: "Worried it's more than a hard meal? When to get help",
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

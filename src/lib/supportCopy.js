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
  title: mealLabel => `${mealLabel} didn't happen today.`,
  saved: "That's saved. Hard meals are part of recovery, not a failure. Here is what your plan says to do now.",
  planHeading: 'If a meal is refused',
  planSource: 'Written by your clinician.',
  noPlan: "Your clinician hasn't written a plan for this yet. Ask about it at your next session, and let them know about this meal below.",
  tellHeading: 'Tell your clinician',
  addLine: 'Add a line (optional)',
  send: 'Send to your clinician',
  done: 'Done for now',
  worried: "Worried it's more than a hard meal? When to get help",
}

// Hard meal mode's calm screen (roadmap C1): the parent is at the table and the meal is going badly.
// It shows only the clinician's own table lines, one at a time, large. The app adds no advice of its
// own: with no lines it says so (same rule as REFUSAL). The time line counts up, never down, and sets
// no target. DRAFT, in docs/clinical/2026-11-26-wording-review.md section 8.
export const CALM = {
  entry: 'This meal is hard',
  entryHint: 'Your plan, one line at a time',
  heading: mealLabel => `${mealLabel}, one line at a time`,
  headingNoLines: mealLabel => `${mealLabel} is hard right now`,
  source: 'From your clinician',
  position: (i, n) => `${i + 1} of ${n}`,
  next: 'Next line',
  back: 'Back',
  again: 'Start again',
  noLines: "Your clinician hasn't written lines to read at the table yet. Ask about it at your next session.",
  steady: "Hard meals happen in recovery. You don't have to work this out alone.",
  end: 'The meal is over',
  endHint: 'Then write down how it went.',
}

// The debrief after a hard meal (roadmap C2): three questions, one tap each, any of them skippable. The
// clinician reads the answers before the next session. "Something worried me" never becomes a note: it
// opens the when-to-call guidance at once (AGENTS.md: red flags route to a human, not advice). Keys match
// DEBRIEF_OPTIONS in lib/events.js. DRAFT, in the wording review, section 9.
export const DEBRIEF = {
  title: mealLabel => `After ${mealLabel.toLowerCase()}`,
  intro: 'Three quick taps for your clinician. Skip any you like.',
  step: (i, n) => `${i + 1} of ${n}`,
  questions: {
    hard: 'What made it hard?',
    helped: 'What helped, if anything?',
    parent: 'How are you doing now?',
  },
  options: {
    hard: {
      wouldnt_start: "Wouldn't start eating",
      stopped: 'Stopped partway',
      upset: 'Very upset or angry',
      bargaining: 'Bargaining or arguing about the food',
      left_table: 'Left the table',
      worried: 'Something worried me',
    },
    helped: {
      plan_lines: 'The lines from our plan',
      staying_calm: 'Staying calm and close',
      distraction: 'Talking about something else',
      other_adult: 'Another adult stepping in',
      more_time: 'Giving it more time',
      nothing: 'Nothing helped this time',
    },
    parent: {
      okay: 'Okay',
      worn_out: 'Worn out',
      need_support: "I'd like some support",
    },
  },
  worriedHint: 'For example being sick after eating, feeling faint, or talk of hurting themselves',
  worriedTitle: 'Some things need a call, not a note',
  continue: 'Continue',
  skip: 'Skip',
  saved: 'Saved. Your clinician will see it before your next session.',
  nothingSaved: "Nothing saved, and that's fine.",
  supportAction: 'Message your care team',
  supportNote: "I'd like some support.",
  done: 'Done',
  offer: 'Tell your clinician what happened',
  // How the clinician reads the answers (session summary, week in review).
  clinician: {
    hard: 'Made it hard',
    helped: 'Helped',
    parent: 'Parent afterwards',
    calm: 'Calm screen used',
    worried: 'Something worried the parent; the app showed when to call for help.',
    none: 'No debrief.',
  },
}

// A quiet count of time at the table: whole minutes, rounded down, no seconds ticking.
export function timeAtTable(startMs, nowMs) {
  const minutes = Math.floor(Math.max(0, nowMs - startMs) / 60000)
  if (minutes < 1) return 'Just sat down'
  return `At the table ${minutes} min`
}

// The one line at the top of the parent's week. It reflects what actually happened and never
// praises a number: no counts, no percentages, no "doing great" after a week of hard meals.
export function weekMessage({ logged = 0, hard = 0 } = {}) {
  if (logged === 0) return 'Nothing written down yet this week. Log a meal on the Today page and it will show up here.'
  if (hard > 0) return 'This week had some hard meals. That is part of recovery, and you kept going.'
  return 'You kept writing meals down this week. Bring anything on your mind to your next session.'
}

// The note attached to the care-team message, so the clinician knows which meal it was about.
export function hardMealNote({ mealLabel, dateLabel, outcomeLabel }) {
  const what = outcomeLabel ? ` (${outcomeLabel.toLowerCase()})` : ''
  return `Hard ${String(mealLabel || 'meal').toLowerCase()} on ${dateLabel}${what}.`
}

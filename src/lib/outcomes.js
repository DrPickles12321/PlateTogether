// One vocabulary for how a meal went, used on every screen. The stored values stay
// okay / difficult / refused / skipped; only the words and marks shown here change.
// "Partly" maps to `difficult` (an open clinician question, see PRODUCT.md).
export const OUTCOME_META = {
  okay:      { label: 'Finished', mark: 'tick',  color: 'var(--st-okay)',    bg: 'var(--st-okay-bg)' },
  difficult: { label: 'Partly',   mark: 'half',  color: 'var(--st-some)',    bg: 'var(--st-some-bg)' },
  refused:   { label: 'Refused',  mark: 'cross', color: 'var(--st-refused)', bg: 'var(--st-refused-bg)' },
  skipped:   { label: 'Skipped',  mark: 'dash',  color: 'var(--st-skipped)', bg: 'var(--st-skipped-bg)' },
}

export const OUTCOME_ORDER = ['okay', 'difficult', 'refused', 'skipped']

export function outcomeLabel(status) {
  return OUTCOME_META[status]?.label || ''
}

// Distress 4 or 5 (before or after) counts as a hard moment. The threshold mirrors the
// "very hard" end of the 1-5 scale the parent sees; a clinician should confirm it.
export const HARD_DISTRESS = 4

// True when a logged meal should be answered with the support card: a refusal, or a
// distress rating at the hard end of the scale. Skipped meals never trigger it.
export function needsSupport({ status, distress } = {}) {
  if (status === 'skipped') return false
  if (status === 'refused') return true
  const pre = Number(distress?.pre) || 0
  const post = Number(distress?.post) || 0
  return Math.max(pre, post) >= HARD_DISTRESS
}

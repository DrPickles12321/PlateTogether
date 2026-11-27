// One vocabulary for how a meal went, used on every screen. The stored values stay
// okay / difficult / refused / skipped; only the words and marks shown here change.
// "Ate some" maps to `difficult` (an open clinician question, see PRODUCT.md).
// Plain words a parent would say at the table, and one ink for all four: the mark's shape
// (full dot, half dot, empty ring, dash) carries the difference, not a good/bad colour.
export const OUTCOME_META = {
  okay:      { label: 'Ate it all', hint: 'All or nearly all of the plate',  mark: 'all',  color: 'var(--st-okay)',    bg: 'var(--st-okay-bg)' },
  difficult: { label: 'Ate some',   hint: 'Part of the plate',               mark: 'some', color: 'var(--st-some)',    bg: 'var(--st-some-bg)' },
  refused:   { label: "Didn't eat", hint: 'None of it, or left the table',   mark: 'none', color: 'var(--st-refused)', bg: 'var(--st-refused-bg)' },
  skipped:   { label: 'Not served', hint: "We didn't sit down for this one", mark: 'skip', color: 'var(--st-skipped)', bg: 'var(--st-skipped-bg)' },
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

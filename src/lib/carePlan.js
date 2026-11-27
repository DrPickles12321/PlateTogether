// The family's meal plan, written by their clinician: a few short lines to read at the table, and
// the steps to follow when a meal is refused. The app never writes these itself; with no plan it
// says so instead of inventing clinical advice.
export const MAX_LINES = 6
export const MAX_LINE_LENGTH = 200

function cleanLines(value) {
  const list = Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
  return list
    .filter(v => typeof v === 'string')
    .map(v => v.trim().slice(0, MAX_LINE_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_LINES)
}

export function normalizeCarePlan(raw) {
  return {
    tableReminders: cleanLines(raw?.tableReminders),
    refusalSteps: cleanLines(raw?.refusalSteps),
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : null,
  }
}

// One line per item, as the clinician types them in a text box.
export function linesFromText(text = '') {
  return cleanLines(String(text).split('\n'))
}

export function hasPlan(plan) {
  return !!plan && (plan.tableReminders.length > 0 || plan.refusalSteps.length > 0)
}

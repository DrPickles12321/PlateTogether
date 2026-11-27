// Older foods were saved before every food got USDA data. This picks a few of them to fill in
// quietly when the family opens the app, so a phone isn't asked to make dozens of calls at once.
// A food with hand-entered nutrition is never touched, and a food USDA couldn't match is not
// retried for `retryDays` days (usdaCheckedAt).
const DAY = 24 * 60 * 60 * 1000

// How many foods one visit fills in, so a phone isn't asked for many lookups at once.
export const BACKFILL_PER_VISIT = 5

export function foodsNeedingNutrition(foods = [], { now = Date.now(), limit = BACKFILL_PER_VISIT, retryDays = 14 } = {}) {
  return foods
    .filter(f => f?.id && f.name && !f.usdaNutrition && !f.nutrition)
    .filter(f => {
      const checked = Date.parse(f.usdaCheckedAt || '')
      return Number.isNaN(checked) || now - checked >= retryDays * DAY
    })
    .slice(0, limit)
}

// The fields to write after a lookup: the group and nutrition when found, and always the date tried.
export function backfillPatch(info, now = new Date()) {
  const patch = { usdaCheckedAt: now.toISOString() }
  if (info?.group) patch.group = info.group
  if (info?.nutrition) patch.usdaNutrition = info.nutrition
  return patch
}

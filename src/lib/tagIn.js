// Tag-in during a hard meal (roadmap C3): one caregiver asks the other to come. The ask is a hardMeal.tagIn
// event in the family record; the other caregivers see it as a banner in the app for TAG_IN_MINUTES, until
// they dismiss it on that device. A phone notification may also be sent (worker/src/tagIn.js); it never
// carries meal or child details.

export const TAG_IN_MINUTES = 30

// The newest ask from someone else, still recent and not dismissed here, or null.
export function activeTagIn(hardMeals = [], { uid, nowMs = Date.now(), dismissed = [] } = {}) {
  let best = null
  for (const h of hardMeals) {
    for (const t of h.tagIns || []) {
      const at = typeof t.at === 'number' ? t.at : null
      if (at == null || t.by === uid || dismissed.includes(h.ref)) continue
      if (nowMs - at > TAG_IN_MINUTES * 60000 || at - nowMs > 60000) continue
      if (!best || at > best.at) best = { ref: h.ref, meal: h.meal, date: h.date, by: t.by, at }
    }
  }
  return best
}

// The other caregivers, to name in "Ask … to come".
export function otherCaregivers(caregivers = []) {
  return caregivers.filter(c => !c.isYou)
}

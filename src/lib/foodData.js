import { auth } from '../firebase'

const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL

// Whether the Worker is configured. Without it (local dev) lookups can't run, so nothing should be
// recorded as "tried".
export function hasFoodProxy() {
  return !!PROXY_URL
}

async function callProxy(body) {
  if (!PROXY_URL) return null
  const user = auth.currentUser
  if (!user) return null
  try {
    const idToken = await user.getIdToken()
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Enrich one food via USDA (group + macros). Returns { group, nutrition } or
// null on any failure — callers fall back to local classification.
export async function fetchFoodInfo(name) {
  if (!name) return null
  const data = await callProxy({ query: name })
  if (!data) return null
  const nutrition = data.nutrition && data.nutrition.calories ? data.nutrition : null
  if (!data.group && !nutrition) return null
  return { group: data.group || null, nutrition }
}

// For filling in older foods: tells "USDA has no match" apart from "the lookup failed", so a failure
// (offline, rate limit) is retried later instead of being recorded as tried.
export async function lookupForBackfill(name) {
  if (!name) return { status: 'none' }
  const data = await callProxy({ query: name })
  if (!data || data.error) return { status: 'error' }
  if (!data.matched) return { status: 'none' }
  const nutrition = data.nutrition && data.nutrition.calories ? data.nutrition : null
  return { status: 'found', group: data.group || null, nutrition }
}

// Search USDA for many foods (Suggested tab). Returns an array of
// { name, group, nutrition } — empty array if unavailable.
export async function searchFoods(query, limit = 12) {
  if (!query || !query.trim()) return []
  const data = await callProxy({ search: query.trim(), limit })
  return Array.isArray(data?.results) ? data.results : []
}

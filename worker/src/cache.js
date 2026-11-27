// Free caching and rate limiting for the Worker's USDA calls. No paid storage: a small in-memory cache
// per Worker instance (always works), plus Cloudflare's built-in Cache API on top where it is
// available. USDA food data changes rarely, so results can be kept for days.

// A tiny least-recently-used cache with a time limit. Lives as long as the Worker instance does.
export function createMemoryCache({ max = 500, ttlMs = 6 * 60 * 60 * 1000 } = {}) {
  const map = new Map()
  return {
    get(key, now = Date.now()) {
      const hit = map.get(key)
      if (!hit) return undefined
      if (hit.expires <= now) { map.delete(key); return undefined }
      map.delete(key)
      map.set(key, hit) // most recently used goes to the end
      return hit.value
    },
    set(key, value, now = Date.now()) {
      if (map.has(key)) map.delete(key)
      map.set(key, { value, expires: now + ttlMs })
      while (map.size > max) map.delete(map.keys().next().value)
    },
    get size() { return map.size },
  }
}

// One key per kind of lookup and normalised query, so "Garlic Bread " and "garlic bread" share it.
export function cacheKey(kind, query, limit = 0) {
  const q = String(query || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return `${kind}:${limit}:${q}`
}

// At most `limit` calls per user in a rolling window. Per Worker instance, so it is a soft limit
// that stops one person (or a stuck client) from using up the shared USDA allowance.
export function createRateLimiter({ limit = 60, windowMs = 60 * 1000 } = {}) {
  const hits = new Map()
  return function allow(userId, now = Date.now()) {
    const id = String(userId || 'anonymous')
    const recent = (hits.get(id) || []).filter(t => now - t < windowMs)
    if (recent.length >= limit) { hits.set(id, recent); return false }
    recent.push(now)
    hits.set(id, recent)
    if (hits.size > 5000) hits.delete(hits.keys().next().value)
    return true
  }
}

// Look in memory, then in Cloudflare's cache, then compute. Only good answers are stored. The edge
// cache is optional: if it isn't available (some workers.dev setups, local dev), memory still works.
export async function cachedJson(key, compute, { memory, edge, edgeTtlSeconds = 7 * 24 * 60 * 60 } = {}) {
  const fromMemory = memory?.get(key)
  if (fromMemory !== undefined) return fromMemory
  const edgeKey = edge ? new Request(`https://usda-cache.platetogether.internal/${encodeURIComponent(key)}`) : null
  if (edge) {
    try {
      const hit = await edge.match(edgeKey)
      if (hit) {
        const value = await hit.json()
        memory?.set(key, value)
        return value
      }
    } catch { /* edge cache unavailable here: fall through to computing */ }
  }
  const value = await compute()
  if (value && !value.error) {
    memory?.set(key, value)
    if (edge) {
      try {
        await edge.put(edgeKey, new Response(JSON.stringify(value), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${edgeTtlSeconds}` },
        }))
      } catch { /* not cached at the edge; memory still has it */ }
    }
  }
  return value
}

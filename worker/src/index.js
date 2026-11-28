import { createRemoteJWKSet, jwtVerify } from 'jose'
import { WHOLE_FOODS, BRANDED, mapCategoryToGroup, extractNutrients, pickResults, relevantCount } from './usda'
import { createMemoryCache, cacheKey, createRateLimiter, cachedJson } from './cache'
import { deleteAccountData, signedInRecently } from './accountDeletion'
import { googleStore } from './googleStore'
import { serviceAccountTokens } from './googleAuth'

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com')
)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

// USDA's GET /foods/search 400s when a dataType value contains spaces/parens
// (e.g. "Survey (FNDDS)"). Use POST with a JSON body, which takes the array cleanly.
function usdaSearch(env, query, pageSize, dataType) {
  // Trim in case the stored secret picked up a trailing newline/space on paste.
  const key = (env.USDA_API_KEY || '').trim()
  return fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, pageSize, dataType }),
  })
}

// Free caching and a soft per-user limit for USDA calls (cache.js). Module scope, so they last as
// long as this Worker instance.
const memory = createMemoryCache()
const allowFoodCall = createRateLimiter({ limit: 60, windowMs: 60 * 1000 })
const edgeCache = () => (typeof caches !== 'undefined' ? caches.default : undefined)

// Single best-match lookup, used to fill in a food's group and nutrition. Returns plain data.
async function lookupFood(query, env) {
  let r
  try {
    r = await usdaSearch(env, query, 1, WHOLE_FOODS)
  } catch (err) {
    console.error('USDA fetch failed:', err.message)
    return { error: 'USDA unreachable' }
  }
  if (!r.ok) return { error: `USDA API ${r.status}` }
  const food = (await r.json()).foods?.[0]
  if (!food) return { matched: null, group: null, nutrition: null }
  return {
    matched: food.description || null,
    foodCategory: food.foodCategory || null,
    group: mapCategoryToGroup(food.foodCategory),
    nutrition: extractNutrients(food),
  }
}

// Multi-result search for the add-food sheet and the Suggested tab. Whole and generic foods first;
// branded products only when fewer than three of those match every word typed, so "garlic bread"
// doesn't fill up with identical store-brand entries. Names are tidied and deduplicated in
// pickResults (usda.js). Returns plain data.
async function searchFoodsMulti(query, limit, env) {
  const pageSize = Math.min(limit * 3, 50)
  try {
    const r = await usdaSearch(env, query, pageSize, WHOLE_FOODS)
    if (!r.ok) return { error: `USDA API ${r.status}` }
    const whole = (await r.json()).foods || []
    let results = pickResults(whole, query, limit)
    if (relevantCount(results, query) < 3) {
      const b = await usdaSearch(env, query, pageSize, BRANDED)
      if (b.ok) results = pickResults([...whole, ...((await b.json()).foods || [])], query, limit)
    }
    return { results }
  } catch (err) {
    console.error('USDA search failed:', err.message)
    return { error: 'USDA unreachable' }
  }
}

async function handleFoodCall(kind, query, limit, env, userId) {
  if (!env.USDA_API_KEY) return json({ error: 'USDA not configured' }, 503)
  if (!allowFoodCall(userId)) return json({ error: 'Too many food searches. Try again in a minute.' }, 429)
  const key = cacheKey(kind, query, limit)
  const data = await cachedJson(key, () => (kind === 'lookup' ? lookupFood(query, env) : searchFoodsMulti(query, limit, env)),
    { memory, edge: edgeCache() })
  // A failed lookup is an error (so the app can retry later), not "no match"; a failed search is just empty.
  if (data?.error) return kind === 'lookup' ? json({ error: data.error }, 502) : json({ results: [] })
  return json(data)
}

// Account deletion on Firestore (accountDeletion.js). Needs the GOOGLE_SERVICE_ACCOUNT secret; the caller is
// always the signed-in person, from their verified token, never a uid in the request.
let deletionTokens = null
async function handleDeleteAccount(payload, body, env) {
  if (body.confirm !== 'DELETE') return json({ error: 'Confirmation missing' }, 400)
  if (!env.GOOGLE_SERVICE_ACCOUNT) return json({ error: 'Account deletion not configured' }, 503)
  if (!signedInRecently(payload)) return json({ error: 'reauth' }, 401)
  try {
    deletionTokens ||= serviceAccountTokens(env.GOOGLE_SERVICE_ACCOUNT)
    const store = googleStore({ projectId: env.FIREBASE_PROJECT_ID, databaseUrl: env.FIREBASE_DATABASE_URL, getToken: deletionTokens })
    await deleteAccountData(payload.sub, store)
    return json({ success: true })
  } catch (err) {
    console.error('Account deletion failed:', err.message) // operation and status only
    return json({ error: 'failed' }, 500)
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    if (!env.FIREBASE_PROJECT_ID) {
      console.error('FIREBASE_PROJECT_ID environment variable is not set')
      return json({ error: 'Server misconfiguration' }, 500)
    }

    let userId, claims
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
        audience: env.FIREBASE_PROJECT_ID,
      })
      userId = payload.sub
      claims = payload
    } catch (err) {
      console.error('JWT verification failed:', err.message)
      return json({ error: 'Invalid or expired token' }, 401)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    // Account deletion: { action: "deleteAccount", confirm: "DELETE" }
    if (body?.action === 'deleteAccount') {
      return handleDeleteAccount(claims, body, env)
    }

    // Chat mode: { system?: string, messages: [{ role, content }] }
    if (Array.isArray(body?.messages)) {
      const messages = body.messages
      if (messages.length === 0 || messages.length > 20) {
        return json({ error: 'messages must be 1-20 items' }, 400)
      }
      for (const m of messages) {
        if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
          return json({ error: 'invalid message' }, 400)
        }
        if (m.content.length > 4000) return json({ error: 'message too long' }, 400)
      }
      const system = typeof body.system === 'string' ? body.system.slice(0, 8000) : undefined
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system,
          messages,
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        return json({ error: `Anthropic API ${res.status}: ${errText}` }, 502)
      }
      const data = await res.json()
      const text = data.content?.[0]?.text
      return json({ text: typeof text === 'string' ? text.trim() : '' })
    }

    // USDA single-food enrichment: { query: "<food name>" }
    if (typeof body?.query === 'string' && body.query.trim()) {
      return handleFoodCall('lookup', body.query.trim().slice(0, 200), 0, env, userId)
    }

    // USDA multi-result search: { search: "<query>", limit?: N }
    if (typeof body?.search === 'string' && body.search.trim()) {
      const limit = Math.min(Math.max(parseInt(body.limit, 10) || 12, 1), 20)
      return handleFoodCall('search', body.search.trim().slice(0, 200), limit, env, userId)
    }

    const prompt = body?.prompt
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return json({ error: 'A non-empty "prompt" string is required' }, 400)
    }
    if (prompt.length > 8000) {
      return json({ error: 'Prompt is too long' }, 400)
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return json({ error: `Anthropic API ${res.status}: ${errText}` }, 502)
    }

    const data = await res.json()
    const text = data.content?.[0]?.text
    return json({ text: typeof text === 'string' ? text.trim() : '' })
  },
}

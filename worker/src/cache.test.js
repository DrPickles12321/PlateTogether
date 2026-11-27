import { describe, it, expect, vi } from 'vitest'
import { createMemoryCache, cacheKey, createRateLimiter, cachedJson } from './cache'

describe('createMemoryCache', () => {
  it('returns what was stored until it expires', () => {
    const c = createMemoryCache({ ttlMs: 1000 })
    c.set('a', 1, 0)
    expect(c.get('a', 500)).toBe(1)
    expect(c.get('a', 1000)).toBeUndefined()
  })
  it('drops the least recently used entry when full', () => {
    const c = createMemoryCache({ max: 2 })
    c.set('a', 1); c.set('b', 2)
    c.get('a') // a is now most recent
    c.set('c', 3)
    expect(c.get('b')).toBeUndefined()
    expect(c.get('a')).toBe(1)
    expect(c.size).toBe(2)
  })
})

describe('cacheKey', () => {
  it('normalises case and spacing', () => {
    expect(cacheKey('search', ' Garlic  Bread ', 8)).toBe(cacheKey('search', 'garlic bread', 8))
    expect(cacheKey('search', 'garlic', 8)).not.toBe(cacheKey('lookup', 'garlic'))
  })
})

describe('createRateLimiter', () => {
  it('allows up to the limit per user in the window', () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 1000 })
    expect(allow('u1', 0)).toBe(true)
    expect(allow('u1', 10)).toBe(true)
    expect(allow('u1', 20)).toBe(false)
    expect(allow('u2', 20)).toBe(true)
    expect(allow('u1', 1100)).toBe(true)
  })
})

describe('cachedJson', () => {
  it('computes once, then serves from memory', async () => {
    const memory = createMemoryCache()
    const compute = vi.fn(async () => ({ results: [1] }))
    expect(await cachedJson('k', compute, { memory })).toEqual({ results: [1] })
    expect(await cachedJson('k', compute, { memory })).toEqual({ results: [1] })
    expect(compute).toHaveBeenCalledTimes(1)
  })
  it('does not cache errors', async () => {
    const memory = createMemoryCache()
    const compute = vi.fn(async () => ({ error: 'USDA API 429' }))
    await cachedJson('k', compute, { memory })
    await cachedJson('k', compute, { memory })
    expect(compute).toHaveBeenCalledTimes(2)
  })
  it('uses the edge cache when present and survives it failing', async () => {
    const stored = new Map()
    const edge = {
      match: async req => (stored.has(req.url) ? new Response(stored.get(req.url)) : undefined),
      put: async (req, res) => { stored.set(req.url, await res.text()) },
    }
    const compute = vi.fn(async () => ({ results: [2] }))
    await cachedJson('k2', compute, { memory: createMemoryCache(), edge })
    expect(await cachedJson('k2', compute, { memory: createMemoryCache(), edge })).toEqual({ results: [2] })
    expect(compute).toHaveBeenCalledTimes(1)
    const broken = { match: async () => { throw new Error('no cache') }, put: async () => { throw new Error('no cache') } }
    expect(await cachedJson('k3', async () => ({ ok: 1 }), { memory: createMemoryCache(), edge: broken })).toEqual({ ok: 1 })
  })
})

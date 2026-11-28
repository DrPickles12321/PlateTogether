import { describe, it, expect } from 'vitest'
import { earlyResponse, thresholdKg, earlyResponseConfig, earlyResponseText, EARLY_RESPONSE_DEFAULTS } from './earlyResponse'

const w = (date, value, unit = 'kg') => ({ date, weight: { value, unit } })
const s = date => ({ date })

describe('the threshold', () => {
  it('defaults to 2.3 kg by session 4, or 2.88% of an ideal body weight the clinician enters', () => {
    expect(thresholdKg()).toBe(2.3)
    expect(thresholdKg({ mode: 'ibw', ibwKg: 52 })).toBe(1.5)
    expect(thresholdKg({ mode: 'ibw' })).toBe(2.3) // no ideal weight given: falls back to kg
    expect(earlyResponseConfig({ kg: -1, bySession: 0, priorSessions: -3 })).toMatchObject({ kg: 2.3, bySession: 4, priorSessions: 0 })
    expect(EARLY_RESPONSE_DEFAULTS.pct).toBe(2.88)
  })
})

describe('early response', () => {
  const sessions = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-23'].map(s)

  it('is on track when the gain by session 4 meets the threshold', () => {
    const r = earlyResponse({ visits: [w('2026-11-02', 44.0), w('2026-11-16', 45.2), w('2026-11-23', 46.5), w('2026-11-30', 47)], sessions })
    expect(r).toMatchObject({ status: 'onTrack', gainKg: 2.5, sessionCount: 4, cutoff: '2026-11-23', baseline: { date: '2026-11-02' }, point: { date: '2026-11-23' } })
  })

  it('is below the threshold otherwise, and works across kg and lb', () => {
    const r = earlyResponse({ visits: [w('2026-11-01', 97.0, 'lb'), w('2026-11-23', 45.0)], sessions })
    expect(r.status).toBe('below')
    expect(r.gainKg).toBe(1)
  })

  it('reports progress before session 4', () => {
    const r = earlyResponse({ visits: [w('2026-11-02', 44.0), w('2026-11-10', 45.0)], sessions: sessions.slice(0, 2) })
    expect(r).toMatchObject({ status: 'inProgress', sessionCount: 2, gainKg: 1 })
  })

  it('says what is missing', () => {
    expect(earlyResponse({ visits: [], sessions }).status).toBe('noWeights')
    expect(earlyResponse({ visits: [w('2026-11-02', 44)], sessions }).status).toBe('needWeight')
    expect(earlyResponse({ visits: [w('2026-11-02', 44)], sessions: [] }).status).toBe('inProgress')
  })

  it('counts sessions held before Plate Together', () => {
    const r = earlyResponse({ visits: [w('2026-11-02', 44.0), w('2026-11-09', 46.4)], sessions: sessions.slice(0, 2), config: { priorSessions: 2 } })
    expect(r).toMatchObject({ status: 'onTrack', sessionCount: 4, cutoff: '2026-11-09', gainKg: 2.4 })
    expect(earlyResponse({ visits: [w('2026-11-02', 44)], sessions, config: { priorSessions: 4 } }).status).toBe('pastWindow')
  })

  it('flags a starting weight recorded after the first session', () => {
    const r = earlyResponse({ visits: [w('2026-11-09', 44.0), w('2026-11-23', 46.5)], sessions })
    expect(r.baselineLate).toBe(true)
    expect(r.status).toBe('onTrack')
  })
})

describe('the words', () => {
  it('states the numbers and the evidence, without advice', () => {
    const r = earlyResponse({ visits: [w('2026-11-02', 44.0), w('2026-11-23', 45.0)], sessions: ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23'].map(s) })
    const { headline, evidence } = earlyResponseText(r)
    expect(headline).toBe('Below the early-response threshold: +1 kg by session 4 (threshold 2.3 kg).')
    expect(evidence).toEqual([
      'Starting weight 44 kg on Nov 2.',
      'Weight used 45 kg on Nov 23.',
      'Sessions marked: Nov 2, Nov 9, Nov 16, Nov 23.',
    ])
    expect(headline + evidence.join(' ')).not.toMatch(/should|must|increase|reduce|calorie|diet|plan/i)
  })
})

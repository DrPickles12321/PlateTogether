import { describe, it, expect } from 'vitest'
import { APP_MODES, normalizeMode, featuresFor, testModeEnabled, parentSeesNumbers } from './appMode'

describe('normalizeMode', () => {
  it('keeps known modes', () => {
    for (const m of APP_MODES) expect(normalizeMode(m.key)).toBe(m.key)
  })
  it('falls back to general for anything else', () => {
    expect(normalizeMode('bulimia')).toBe('general')
    expect(normalizeMode(null)).toBe('general')
    expect(normalizeMode(undefined)).toBe('general')
  })
})

describe('featuresFor', () => {
  it('hides nutrition numbers only in anorexia mode', () => {
    expect(featuresFor('anorexia').hideNutritionNumbers).toBe(true)
    expect(featuresFor('general').hideNutritionNumbers).toBe(false)
    expect(featuresFor('nonsense').hideNutritionNumbers).toBe(false)
  })
})

describe('testModeEnabled', () => {
  it('is on in development or with ?testmode', () => {
    expect(testModeEnabled({ dev: true })).toBe(true)
    expect(testModeEnabled({ search: '?testmode' })).toBe(true)
    expect(testModeEnabled({ search: '?x=1&testmode=1' })).toBe(true)
  })
  it('is off for ordinary visitors', () => {
    expect(testModeEnabled({})).toBe(false)
    expect(testModeEnabled({ search: '?x=1' })).toBe(false)
  })
})

describe('parentSeesNumbers', () => {
  it("follows the clinician's switch when it is set", () => {
    expect(parentSeesNumbers({ mode: 'anorexia', setting: { showToParent: true } })).toBe(true)
    expect(parentSeesNumbers({ mode: 'general', setting: { showToParent: false } })).toBe(false)
  })
  it('falls back to the app mode when the clinician has not chosen', () => {
    expect(parentSeesNumbers({ mode: 'anorexia', setting: null })).toBe(false)
    expect(parentSeesNumbers({ mode: 'general', setting: null })).toBe(true)
    expect(parentSeesNumbers({ mode: 'anorexia', setting: { showToParent: 'yes' } })).toBe(false)
  })
})

// Test-only "type of app" switch. The real design is a per-family setting chosen by
// the clinician (see docs/plans/2026-11-22-anorexia-focus.md); until then it is
// remembered on this device only.
export const APP_MODES = [
  { key: 'general',  label: 'General meal support',     blurb: 'The app as it is today.' },
  { key: 'anorexia', label: 'Anorexia (family-based)',  blurb: 'Parents lead meals. Parents do not see nutrition numbers.' },
]

export const DEFAULT_MODE = 'general'
export const MODE_STORAGE_KEY = 'plate.appMode'

export function normalizeMode(value) {
  return APP_MODES.some(m => m.key === value) ? value : DEFAULT_MODE
}

// What each mode turns on or off. Add flags here so screens ask one place.
export function featuresFor(mode) {
  return { hideNutritionNumbers: normalizeMode(mode) === 'anorexia' }
}

// Whether a parent sees nutrition numbers. The family's clinician decides with a switch
// (users/{parent}/nutritionDisplay); until they have chosen, the app mode decides
// (the anorexia version hides numbers from parents).
export function parentSeesNumbers({ mode, setting } = {}) {
  if (setting && typeof setting.showToParent === 'boolean') return setting.showToParent
  return normalizeMode(mode) !== 'anorexia'
}

// The chooser is a testing aid: shown in development, or on the live site only
// when the address has ?testmode.
export function testModeEnabled({ dev = false, search = '' } = {}) {
  return dev || new URLSearchParams(search).has('testmode')
}

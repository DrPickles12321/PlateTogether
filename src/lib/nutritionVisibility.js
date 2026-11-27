import { programConfig } from './programs'

// Whether a parent sees nutrition numbers. The family's clinician decides with a switch
// (users/{parent}/nutritionDisplay, set by an active linked clinician only); until they do, the
// program and phase decide (lib/programs.js), and for anorexia that is always no.
export function parentSeesNumbers(setting, config = programConfig()) {
  if (typeof setting?.showToParent === 'boolean') return setting.showToParent
  return config.parentSeesNumbers === true
}

// Whether a parent sees nutrition numbers. Plate Together is built for families in anorexia
// treatment, so numbers stay off parent screens unless the family's clinician turns them on
// (users/{parent}/nutritionDisplay, set by an active linked clinician only).
export function parentSeesNumbers(setting) {
  return setting?.showToParent === true
}

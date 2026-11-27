import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { parentSeesNumbers } from '../lib/nutritionVisibility'
import { programConfig, DEFAULT_PROGRAM } from '../lib/programs'

// Whether nutrition numbers are hidden on the parent's screens: the clinician's switch if set,
// otherwise the program and phase default (lib/nutritionVisibility.js).
export function useNutritionVisibility() {
  const { nutritionDisplay, childProfile } = useFirebaseData()
  const config = programConfig(DEFAULT_PROGRAM, childProfile?.phase)
  return { hideNutritionNumbers: !parentSeesNumbers(nutritionDisplay, config) }
}

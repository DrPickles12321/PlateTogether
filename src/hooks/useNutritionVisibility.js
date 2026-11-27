import { useAppMode } from './useAppMode'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { parentSeesNumbers } from '../lib/appMode'

// Whether nutrition numbers are hidden on the parent's screens: the clinician's switch for this
// family if they have set it, otherwise the app mode (lib/appMode.js parentSeesNumbers).
export function useNutritionVisibility() {
  const { mode } = useAppMode()
  const { nutritionDisplay } = useFirebaseData()
  return { hideNutritionNumbers: !parentSeesNumbers({ mode, setting: nutritionDisplay }) }
}

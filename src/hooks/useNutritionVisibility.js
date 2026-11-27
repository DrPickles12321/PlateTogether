import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { parentSeesNumbers } from '../lib/nutritionVisibility'

// Whether nutrition numbers are hidden on the parent's screens: hidden unless the family's
// clinician has turned them on (lib/nutritionVisibility.js).
export function useNutritionVisibility() {
  const { nutritionDisplay } = useFirebaseData()
  return { hideNutritionNumbers: !parentSeesNumbers(nutritionDisplay) }
}

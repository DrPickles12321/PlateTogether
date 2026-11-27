import { createContext } from 'react'

// One context, filled by whichever data layer is active (lib/backend.js): the Realtime Database one in
// FirebaseDataContext.jsx or the Firestore one in FirestoreDataProvider.jsx. Screens read it with
// useFirebaseData() and never know which one it is.
export const FirebaseDataContext = createContext(null)

export const DEFAULT_TARGETS = { protein: 75, carbs: 150, fruitsVeggies: 200 }

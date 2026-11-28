// Which database the app reads and writes: 'firestore' (the family record, docs/plans/2026-11-27-fbt-framework.md)
// since the switch-over on 2026-11-28, or 'rtdb' (Realtime Database, before it). Setting it back to 'rtdb'
// is the rollback; data written on Firestore since the switch is not in Realtime Database.
const CHOSEN = 'firestore'

// Local development may try the other one with VITE_DATA_BACKEND; production builds ignore it.
const override = import.meta.env.DEV ? import.meta.env.VITE_DATA_BACKEND : undefined
export const DATA_BACKEND = override === 'firestore' || override === 'rtdb' ? override : CHOSEN
export const onFirestore = DATA_BACKEND === 'firestore'

// Which database the app reads and writes: 'rtdb' (Realtime Database, today) or 'firestore' (the family
// record, docs/plans/2026-11-27-fbt-framework.md). Flipping CHOSEN is the switch-over step; follow
// docs/plans/2026-11-28-firestore-switch.md, never flip it on its own.
const CHOSEN = 'rtdb'

// Local development may try the other one with VITE_DATA_BACKEND; production builds ignore it.
const override = import.meta.env.DEV ? import.meta.env.VITE_DATA_BACKEND : undefined
export const DATA_BACKEND = override === 'firestore' || override === 'rtdb' ? override : CHOSEN
export const onFirestore = DATA_BACKEND === 'firestore'

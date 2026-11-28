import { signOut } from 'firebase/auth'
import { terminate, clearIndexedDbPersistence } from 'firebase/firestore'
import { auth, fsdb } from '../firebase'
import { forgetDevice, browserStorage } from './offlineDevice'
import { OFFLINE } from './supportCopy'

// Shared by the top bar (desktop) and the Account page (phones). Signing out also removes the family's
// record from this device (roadmap C4), then reloads, because a cleared Firestore can't be used again.
// Logs still waiting to send would be lost, so the parent is asked first.
export async function signOutOfApp({ unsent = false, ask = true } = {}) {
  if (unsent && ask && !window.confirm(OFFLINE.signOutUnsent)) return
  const storage = browserStorage()
  try { storage?.removeItem('demoRole') } catch { /* storage blocked */ }
  forgetDevice(storage)
  await signOut(auth).catch(() => {})
  try {
    await terminate(fsdb)
    await clearIndexedDbPersistence(fsdb)
  } catch { /* nothing kept on this device */ }
  window.location.assign('/')
}

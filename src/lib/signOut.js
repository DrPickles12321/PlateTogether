import { signOut } from 'firebase/auth'
import { auth } from '../firebase'

// Shared by the top bar (desktop) and the Account page (phones).
export function signOutOfApp() {
  localStorage.removeItem('demoRole')
  return signOut(auth)
}

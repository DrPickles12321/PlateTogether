import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { readRole } from '../lib/accounts'
import { rememberRole, rememberedRole, browserStorage } from '../lib/offlineDevice'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(undefined)
  const [role, setRole]           = useState(null)
  const [loginError, setLoginError] = useState('')
  const pendingRoleRef            = useRef(null)  // set by LoginScreen before sign-in

  useEffect(() => {
    return onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        try {
          const storedRole = await readRole(firebaseUser.uid)
          // Guard: user might have been signed out while we awaited
          if (auth.currentUser?.uid !== firebaseUser.uid) return
          if (pendingRoleRef.current && storedRole && storedRole !== pendingRoleRef.current) {
            pendingRoleRef.current = null
            await signOut(auth)
            setLoginError(`This email is registered as a ${storedRole}. Please select the correct role.`)
            return
          }
          const pendingRole = pendingRoleRef.current
          pendingRoleRef.current = null
          // A brand-new account's role write may not have propagated by the time
          // this listener fires, so fall back to the role the user just selected.
          setRole(storedRole || pendingRole)
          rememberRole(browserStorage(), firebaseUser.uid, storedRole || pendingRole)
          setUser(firebaseUser)
        } catch {
          // Offline, the role may not be readable; the one remembered on this device keeps a parent signed in.
          const remembered = !pendingRoleRef.current && rememberedRole(browserStorage(), firebaseUser.uid)
          if (remembered) {
            setRole(remembered)
            setUser(firebaseUser)
            return
          }
          pendingRoleRef.current = null
          await signOut(auth)
          setLoginError('Something went wrong loading your account. Please sign in again.')
        }
      } else {
        setUser(null)
        setRole(null)
      }
    })
  }, [])

  function setPendingRole(r) { pendingRoleRef.current = r }
  function clearLoginError() { setLoginError('') }

  return (
    <AuthContext.Provider value={{ user, role, loginError, setPendingRole, clearLoginError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

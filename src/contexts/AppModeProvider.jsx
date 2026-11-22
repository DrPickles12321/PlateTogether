import { useState, useMemo } from 'react'
import { AppModeContext } from './appModeContext'
import { MODE_STORAGE_KEY, normalizeMode, featuresFor } from '../lib/appMode'

function readStoredMode() {
  try { return normalizeMode(localStorage.getItem(MODE_STORAGE_KEY)) } catch { return 'general' }
}

export default function AppModeProvider({ children }) {
  const [mode, setModeState] = useState(readStoredMode)

  const value = useMemo(() => ({
    mode,
    setMode: next => {
      const safe = normalizeMode(next)
      setModeState(safe)
      try { localStorage.setItem(MODE_STORAGE_KEY, safe) } catch { /* private window: keep in memory only */ }
    },
    ...featuresFor(mode),
  }), [mode])

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>
}

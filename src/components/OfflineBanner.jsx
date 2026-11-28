import { useEffect, useState } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { OFFLINE } from '../lib/supportCopy'

// A quiet line at the top of the parent's screens (roadmap C4): offline, logging still works and is sent
// later; back online, "Sending…" only if it takes more than a moment, so a normal save never flickers.
const SENDING_DELAY_MS = 3000

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

export default function OfflineBanner() {
  const { syncPending } = useFirebaseData()
  const online = useOnline()
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!syncPending) return undefined
    const id = setTimeout(() => setSlow(true), SENDING_DELAY_MS)
    return () => { clearTimeout(id); setSlow(false) }
  }, [syncPending])

  const text = !online ? OFFLINE.offline : syncPending && slow ? OFFLINE.sending : null
  if (!text) return null
  return (
    <p role="status" style={{
      margin: 0, padding: '10px 20px', fontSize: 14, lineHeight: 1.45,
      background: 'var(--highlight)', color: 'var(--highlight-ink)', borderBottom: '1px solid var(--rule)',
    }}>{text}</p>
  )
}

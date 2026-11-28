import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { activeTagIn } from '../lib/tagIn'
import { loggerName } from '../lib/firestoreViews'
import { NEXT_MEALS } from '../lib/nextMeal'
import { TAG_IN } from '../lib/supportCopy'

// When the other caregiver taps "Ask … to come" during a hard meal (roadmap C3), this shows at the top of
// every parent screen for half an hour, until dismissed on this device.
const KEY = 'pt_tagin_dismissed'
const readDismissed = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }

export default function TagInBanner() {
  const { user } = useAuth()
  const { hardMeals = [], caregivers = [] } = useFirebaseData()
  const [dismissed, setDismissed] = useState(readDismissed)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  const ask = activeTagIn(hardMeals, { uid: user?.uid, nowMs: now, dismissed })
  if (!ask) return null
  const name = loggerName(ask.by, { uid: user?.uid, caregivers })
  const mealLabel = NEXT_MEALS.find(m => m.key === ask.meal)?.label || 'This meal'

  function dismiss() {
    const next = [...dismissed, ask.ref].slice(-20)
    setDismissed(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage blocked */ }
  }

  return (
    <div role="alert" style={{ background: 'var(--apricot)', color: 'var(--text-dark)', padding: '12px 20px', borderBottom: '1px solid var(--rule)' }}>
      <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{TAG_IN.banner(name.charAt(0).toUpperCase() + name.slice(1), mealLabel)}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {ask.meal && (
          <Link to={`/parent/next/hard/${ask.meal}`} onClick={dismiss} style={{
            display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 14px', borderRadius: 'var(--radius)',
            background: 'var(--ink)', color: 'var(--on-ink)', fontWeight: 600, textDecoration: 'none',
          }}>{TAG_IN.open}</Link>
        )}
        <button type="button" onClick={dismiss} style={{
          minHeight: 44, padding: '0 14px', borderRadius: 'var(--radius)', border: '1.5px solid var(--ink)',
          background: 'transparent', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer',
        }}>{TAG_IN.dismiss}</button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { localIsoDate } from '../lib/constants'
import { NEXT_MEALS } from '../lib/nextMeal'
import { OUTCOME_META, OUTCOME_ORDER } from '../lib/outcomes'
import { DIFFICULTY_LEVELS, STATUS_TO_OUTCOME } from '../lib/quickLog'
import Icon, { OutcomeMark } from '../components/Icon'

// Logging one meal from Next meal: pick how it went (one ink for every answer, a checkmark for
// the chosen one), optionally how hard it was, then save. "Didn't eat" goes straight on to the
// family's refusal plan; after the calm screen, the debrief follows.
export default function LogMealView() {
  const { meal = '' } = useParams()
  const { mealStatuses = {}, setMealStatus } = useOutletContext()
  const { quickLogMeal } = useFirebaseData()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { state: from } = useLocation()
  const today = localIsoDate()
  const info = NEXT_MEALS.find(m => m.key === meal)
  const [status, setStatus] = useState(() => mealStatuses[today]?.[meal] || null)
  const [difficulty, setDifficulty] = useState(null)

  if (!info) return <Navigate to="/parent/next" replace />

  const name = info.label.toLowerCase()
  const edge = isMobile
    ? { borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }
    : { border: '1px solid var(--rule)' }

  function save() {
    if (!status) return
    if (status === 'skipped') setMealStatus(today, meal, 'skipped')
    else quickLogMeal(today, meal, { outcome: STATUS_TO_OUTCOME[status], difficulty: difficulty ?? undefined })
    // After the calm screen, the debrief comes next (a refusal shows its plan first, then the debrief).
    const hard = from?.fromHardMeal ? { fromHardMeal: true, hardMealRef: from.hardMealRef } : null
    if (status === 'refused') navigate(`/parent/next/refused/${today}/${meal}`, { state: hard })
    else if (hard && status !== 'skipped') navigate(`/parent/next/debrief/${today}/${meal}`, { state: hard })
    else navigate('/parent/next', { state: { saved: { key: meal, label: info.label, status } } })
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', paddingTop: isMobile ? 0 : 12, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', minHeight: 44, padding: '0 12px', borderBottom: '1px solid var(--rule)' }}>
        <Link to="/parent/next" style={{ display: 'flex', alignItems: 'center', minHeight: 44, padding: '0 8px', fontSize: 17, textDecoration: 'none', justifySelf: 'start' }}>Cancel</Link>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{info.label}</span>
        <span />
      </div>

      <h1 id="how" style={{ padding: '20px 20px 12px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>How did {name} go?</h1>

      <div role="group" aria-labelledby="how" style={{ ...edge, background: 'white', paddingLeft: 20 }}>
        {OUTCOME_ORDER.map((key, i) => {
          const m = OUTCOME_META[key]
          const on = status === key
          return (
            <button key={key} type="button" aria-pressed={on} onClick={() => setStatus(key)} style={{
              display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 60, padding: '8px 20px 8px 0',
              border: 'none', borderBottom: i < OUTCOME_ORDER.length - 1 ? '1px solid var(--rule)' : 'none',
              background: 'transparent', color: 'var(--text-dark)', textAlign: 'left', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <OutcomeMark mark={m.mark} size={22} color={m.color} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 17, fontWeight: 500 }}>{m.label}</span>
                <span style={{ display: 'block', fontSize: 14, color: 'var(--text-light)', marginTop: 1 }}>{m.hint}</span>
              </span>
              <span style={{ color: 'var(--ink)', opacity: on ? 1 : 0 }}><Icon name="tick" size={20} strokeWidth={2.6} /></span>
            </button>
          )
        })}
      </div>

      {status && status !== 'skipped' && (
        <section aria-labelledby="hard" style={{ marginTop: 20, background: 'var(--ink-light)', padding: '14px 20px 16px' }}>
          <h2 id="hard" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-hover)', marginBottom: 10 }}>
            How hard was it? <span style={{ fontWeight: 400, color: 'var(--text-mid)' }}>Optional</span>
          </h2>
          <div role="group" aria-labelledby="hard" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
            {DIFFICULTY_LEVELS.map(level => {
              const on = difficulty === level
              return (
                <button key={level} type="button" aria-pressed={on} onClick={() => setDifficulty(on ? null : level)}
                  aria-label={`${level} of 5${level === 1 ? ', calm' : level === 5 ? ', very hard' : ''}`}
                  style={{
                    minHeight: 48, borderRadius: 'var(--radius)', fontSize: 17, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${on ? 'var(--ink)' : 'transparent'}`,
                    background: on ? 'white' : 'rgba(255,255,255,0.55)', color: on ? 'var(--ink-hover)' : 'var(--text-mid)',
                  }}>{level}</button>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-mid)', marginTop: 6 }}>
            <span>Calm</span><span>Very hard</span>
          </div>
        </section>
      )}

      <div style={{ padding: '20px 20px 8px' }}>
        <button type="button" onClick={save} disabled={!status} style={{
          width: '100%', minHeight: 52, border: 'none', borderRadius: 'var(--radius)', fontSize: 17, fontWeight: 600,
          background: status ? 'var(--ink)' : 'var(--border-mid)', color: status ? 'var(--on-ink)' : 'var(--text-mid)',
          cursor: status ? 'pointer' : 'not-allowed',
        }}>{status === 'refused' ? 'Save and see your plan' : 'Save'}</button>
      </div>
    </div>
  )
}

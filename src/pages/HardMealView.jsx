import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { NEXT_MEALS } from '../lib/nextMeal'
import { localIsoDate } from '../lib/constants'
import { CALM, HARD_MEAL, hardMealNote, timeAtTable } from '../lib/supportCopy'
import Icon from '../components/Icon'
import HelpSheet from '../components/HelpSheet'

// Hard meal mode's calm screen (roadmap C1, framework section 6.2). The parent is at the table and it's
// going badly: one of the clinician's lines at a time, large enough to read at a glance, a quiet count of
// time at the table, and help one tap away. Like an aviation checklist, it asks nothing of a stressed
// reader but the next tap. Opening and closing it are recorded for the debrief and the session summary.
export default function HardMealView() {
  const { meal = '' } = useParams()
  const { carePlan, startHardMeal, endHardMeal } = useFirebaseData()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const mealInfo = NEXT_MEALS.find(m => m.key === meal)
  const lines = carePlan?.tableReminders || []
  const [index, setIndex] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(startedAt)
  const hardMealRef = useRef(null)

  // Recorded once per visit, even when React runs effects twice in development.
  useEffect(() => {
    if (!mealInfo || hardMealRef.current) return
    hardMealRef.current = startHardMeal(meal) || 'unrecorded'
  }, [mealInfo, meal, startHardMeal])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  if (!mealInfo) return <Navigate to="/parent/next" replace />

  const last = index >= lines.length - 1
  const dateLabel = new Date(localIsoDate() + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  function finish() {
    const ref = hardMealRef.current
    endHardMeal(meal, ref && ref !== 'unrecorded' ? ref : undefined)
    navigate(`/parent/next/log/${meal}`)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', paddingTop: isMobile ? 0 : 12, display: 'flex', flexDirection: 'column' }}>
      <section aria-labelledby="calm-title" style={{ background: 'var(--ink)', color: 'var(--on-ink)', padding: '4px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Link to="/parent/next" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, minHeight: 44, marginLeft: -6, color: 'var(--on-ink)', fontSize: 16, textDecoration: 'none' }}>
            <Icon name="left" size={20} />Next meal
          </Link>
          <button onClick={() => setHelpOpen(true)} style={{
            minHeight: 44, padding: '0 2px', border: 'none', background: 'none', color: 'var(--on-ink)',
            fontSize: 15, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer',
          }}>{HARD_MEAL.helpAction}</button>
        </div>
        <h1 id="calm-title" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2, marginTop: 4, color: 'var(--on-ink)' }}>
          {lines.length > 0 ? CALM.heading(mealInfo.label) : CALM.headingNoLines(mealInfo.label)}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--on-ink-soft)', marginTop: 4 }}>{timeAtTable(startedAt, now)}</p>
      </section>

      <section aria-label={CALM.source} style={{ background: 'white', borderBottom: '1px solid var(--rule)', padding: '20px 20px 18px' }}>
        {lines.length > 0 ? (
          <>
            <p style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              <span>{CALM.source}</span>
              <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>{CALM.position(index, lines.length)}</span>
            </p>
            <p aria-live="polite" style={{
              minHeight: isMobile ? '34vh' : 220, display: 'flex', alignItems: 'center',
              fontSize: 27, lineHeight: 1.3, fontWeight: 600, color: 'var(--text-dark)', padding: '18px 0',
            }}>{lines[index]}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              {index > 0 && (
                <button onClick={() => setIndex(i => i - 1)} style={secondary}>{CALM.back}</button>
              )}
              <button onClick={() => setIndex(i => (last ? 0 : i + 1))} style={{ ...primary, flex: 1 }}>
                {last ? CALM.again : CALM.next}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 22, lineHeight: 1.35, fontWeight: 600, color: 'var(--text-dark)', padding: '8px 0 12px' }}>{CALM.steady}</p>
            <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-mid)' }}>{CALM.noLines}</p>
          </>
        )}
      </section>

      <div style={{ padding: '18px 20px 0', display: 'grid', gap: 6 }}>
        <button onClick={finish} style={{ ...secondary, width: '100%' }}>{CALM.end}</button>
        <p style={{ fontSize: 14, color: 'var(--text-mid)', textAlign: 'center' }}>{CALM.endHint}</p>
      </div>

      <HelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        defaultNote={hardMealNote({ mealLabel: mealInfo.label, dateLabel })}
      />
    </div>
  )
}

const primary = {
  minHeight: 56, padding: '0 18px', border: 'none', borderRadius: 'var(--radius)',
  background: 'var(--ink)', color: 'var(--on-ink)', fontSize: 18, fontWeight: 600, cursor: 'pointer',
}
const secondary = {
  minHeight: 56, padding: '0 18px', border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)',
  background: 'white', color: 'var(--text-dark)', fontSize: 17, fontWeight: 600, cursor: 'pointer',
}

import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { NEXT_MEALS } from '../lib/nextMeal'
import { REFUSAL, HARD_MEAL, hardMealNote } from '../lib/supportCopy'
import Icon from '../components/Icon'
import HelpSheet from '../components/HelpSheet'

// Right after a meal is marked "Didn't eat": a soft apricot band that says it's saved and not a
// failure, the family's own plan for this moment (written by their clinician), and a message
// to the clinician tied to this meal. Emergency numbers stay one tap away behind "When to get
// help" (see REFUSAL in lib/supportCopy.js for why). "Done for now" leads to the short debrief (DebriefView).
export default function RefusalPlanView() {
  const { date = '', meal = '' } = useParams()
  const { state } = useLocation()
  const { carePlan, sendSos } = useFirebaseData()
  const isMobile = useIsMobile()
  const [extra, setExtra] = useState('')
  const [sent, setSent] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const mealLabel = NEXT_MEALS.find(m => m.key === meal)?.label || 'The meal'
  const dateLabel = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'today'
  const note = hardMealNote({ mealLabel, dateLabel, outcomeLabel: 'Refused' })
  const steps = carePlan?.refusalSteps || []
  const edge = isMobile
    ? { borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }
    : { border: '1px solid var(--rule)' }

  function send() {
    sendSos({ note: extra.trim() ? `${note} ${extra.trim()}` : note })
    setSent(true)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', paddingTop: isMobile ? 0 : 12, display: 'flex', flexDirection: 'column' }}>
      <section style={{ background: 'var(--highlight)', padding: '4px 20px 20px' }}>
        <Link to="/parent/next" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, minHeight: 44, marginLeft: -6, color: 'var(--text-dark)', fontSize: 16, textDecoration: 'none' }}>
          <Icon name="left" size={20} />Next meal
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: 4 }}>{REFUSAL.title(mealLabel)}</h1>
        <p style={{ fontSize: 17, lineHeight: 1.45, color: 'var(--highlight-ink)', marginTop: 8 }}>{REFUSAL.saved}</p>
      </section>

      <section aria-labelledby="refusal-plan">
        <h2 id="refusal-plan" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', padding: '18px 20px 6px' }}>{REFUSAL.planHeading}</h2>
        {steps.length > 0 ? (
          <>
            <ol style={{ ...edge, listStyle: 'none', margin: 0, padding: '0 0 0 20px', background: 'white' }}>
              {steps.map((s, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, padding: '12px 20px 12px 0', borderBottom: i < steps.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                  <span style={{ flex: 'none', width: 18, fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>{i + 1}</span>
                  <span style={{ fontSize: 17, lineHeight: 1.35 }}>{s}</span>
                </li>
              ))}
            </ol>
            <p style={{ fontSize: 13, color: 'var(--text-light)', padding: '6px 20px 0' }}>{REFUSAL.planSource}</p>
          </>
        ) : (
          <p style={{ ...edge, background: 'white', padding: '12px 20px', fontSize: 15, lineHeight: 1.5, color: 'var(--text-mid)' }}>{REFUSAL.noPlan}</p>
        )}
      </section>

      <section aria-labelledby="tell" style={{ marginTop: 18, background: 'var(--ink-light)', padding: '14px 20px 16px' }}>
        <h2 id="tell" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-hover)', marginBottom: 6 }}>{REFUSAL.tellHeading}</h2>
        {sent ? (
          <p role="status" style={{ fontSize: 15, lineHeight: 1.5 }}>{HARD_MEAL.sent}</p>
        ) : (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 10 }}>We'll send: "{note}"</p>
            <label htmlFor="refusal-extra" style={{ display: 'block', fontSize: 14, color: 'var(--text-mid)', marginBottom: 4 }}>{REFUSAL.addLine}</label>
            <input
              id="refusal-extra" type="text" value={extra} maxLength={300} onChange={e => setExtra(e.target.value)}
              style={{ boxSizing: 'border-box', width: '100%', minHeight: 48, padding: '8px 14px', border: '1.5px solid var(--ink-mid)', borderRadius: 'var(--radius)', fontSize: 17, background: 'white' }}
            />
            <button onClick={send} style={{
              marginTop: 10, width: '100%', minHeight: 52, border: 'none', borderRadius: 'var(--radius)',
              background: 'var(--ink)', color: 'var(--on-ink)', fontSize: 17, fontWeight: 600, cursor: 'pointer',
            }}>{REFUSAL.send}</button>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 8 }}>{HARD_MEAL.notMonitored}</p>
          </>
        )}
      </section>

      <div style={{ display: 'grid', gap: 2, padding: '16px 20px 0' }}>
        <Link to={`/parent/next/debrief/${date}/${meal}`} state={state} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: 'var(--radius)',
          border: '1.5px solid var(--border-mid)', background: 'white', color: 'var(--text-dark)', fontWeight: 600, textDecoration: 'none',
        }}>{REFUSAL.done}</Link>
        <button onClick={() => setHelpOpen(true)} style={{ minHeight: 44, border: 'none', background: 'none', color: 'var(--ink)', fontSize: 15, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {REFUSAL.worried}
        </button>
      </div>

      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { NEXT_MEALS } from '../lib/nextMeal'
import { REFUSAL, HARD_MEAL, hardMealNote } from '../lib/supportCopy'
import Icon from '../components/Icon'
import HelpSheet from '../components/HelpSheet'

// Right after a meal is marked Refused: the family's own plan for this moment, written by their
// clinician, and a message to the clinician tied to this meal. Emergency numbers stay one tap
// away behind "When to get help" (see REFUSAL in lib/supportCopy.js for why).
const card = { background: 'white', border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)', padding: '14px 16px' }

export default function RefusalPlanView() {
  const { date = '', meal = '' } = useParams()
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

  function send() {
    sendSos({ note: extra.trim() ? `${note} ${extra.trim()}` : note })
    setSent(true)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', padding: isMobile ? '12px 16px 24px' : '24px 8px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link to="/parent/next" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
        <Icon name="left" size={18} />Next meal
      </Link>

      <div>
        <h1 className="font-hand" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.15 }}>{REFUSAL.title(mealLabel)}</h1>
        <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--text-mid)', marginTop: 8 }}>{REFUSAL.saved}</p>
      </div>

      <section aria-labelledby="refusal-plan" style={card}>
        <h2 id="refusal-plan" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{REFUSAL.planHeading}</h2>
        {steps.length > 0 ? (
          <>
            <ol className="font-hand" style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 10, fontSize: 17, lineHeight: 1.4, color: 'var(--ink)' }}>
              {steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 12 }}>{REFUSAL.planSource}</p>
          </>
        ) : (
          <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-mid)' }}>{REFUSAL.noPlan}</p>
        )}
      </section>

      <section aria-labelledby="tell" style={{ ...card, background: 'var(--ink-light)', borderColor: 'var(--ink-mid)' }}>
        <h2 id="tell" style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{REFUSAL.tellHeading}</h2>
        {sent ? (
          <p role="status" style={{ fontSize: 15, lineHeight: 1.5 }}>{HARD_MEAL.sent}</p>
        ) : (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 10 }}>
              We'll send: <span className="font-hand" style={{ color: 'var(--ink)' }}>"{note}"</span>
            </p>
            <label htmlFor="refusal-extra" style={{ display: 'block', fontSize: 14, color: 'var(--text-mid)', marginBottom: 4 }}>{REFUSAL.addLine}</label>
            <input
              id="refusal-extra" type="text" value={extra} maxLength={300} onChange={e => setExtra(e.target.value)}
              style={{ boxSizing: 'border-box', width: '100%', minHeight: 44, padding: '8px 12px', border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: 16, background: 'white' }}
            />
            <button onClick={send} style={{
              marginTop: 10, width: '100%', minHeight: 48, border: 'none', borderRadius: 'var(--radius)',
              background: 'var(--ink)', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}><Icon name="message" size={18} />{REFUSAL.send}</button>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 8 }}>{HARD_MEAL.notMonitored}</p>
          </>
        )}
      </section>

      <div style={{ display: 'grid', gap: 4 }}>
        <Link to="/parent/next" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 'var(--radius)',
          border: '1.5px solid var(--border-mid)', background: 'white', color: 'var(--text-dark)', fontWeight: 700, textDecoration: 'none',
        }}>{REFUSAL.done}</Link>
        <button onClick={() => setHelpOpen(true)} style={{ minHeight: 44, border: 'none', background: 'none', color: 'var(--ink)', fontSize: 15, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {REFUSAL.worried}
        </button>
      </div>

      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { localIsoDate } from '../lib/constants'
import { pickNextMeal, shortTime, loggedCount } from '../lib/nextMeal'
import { sameAsYesterday } from '../lib/quickLog'
import { OUTCOME_META } from '../lib/outcomes'
import Icon, { OutcomeMark } from '../components/Icon'
import HelpSheet from '../components/HelpSheet'

// The parent's home: the one meal that matters now, what the care plan says about it, and four
// big buttons for how it went. A refusal opens the family's own plan instead of a dead end.
const CHOICES = [
  { status: 'okay', outcome: 'finished' },
  { status: 'difficult', outcome: 'partly' },
  { status: 'refused', outcome: 'refused' },
  { status: 'skipped', outcome: null },
]

const card = { background: 'white', border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)', padding: '14px 16px' }
const h2 = { fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 8px' }

export default function NextMealView() {
  const { mealStatuses = {}, allMealItems = {}, setMealStatus } = useOutletContext()
  const { mealTimesByDate = {}, assignedChallenges = [], carePlan, quickLogMeal } = useFirebaseData()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [justSaved, setJustSaved] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)

  const today = localIsoDate()
  const statuses = mealStatuses[today] || {}
  const next = pickNextMeal({ statuses, times: mealTimesByDate[today] || {} })
  const lastTime = next ? sameAsYesterday(allMealItems, today, next.key) : []
  const challenges = (Array.isArray(assignedChallenges) ? assignedChallenges : []).map(c => c.name).filter(Boolean)
  const reminders = carePlan?.tableReminders || []
  const dayLabel = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
  const logged = loggedCount(statuses)

  function choose(choice) {
    if (!next) return
    if (choice.outcome) quickLogMeal(today, next.key, { outcome: choice.outcome })
    else setMealStatus(today, next.key, 'skipped')
    if (choice.status === 'refused') {
      navigate(`/parent/next/refused/${today}/${next.key}`)
      return
    }
    setJustSaved({ key: next.key, label: next.label, status: choice.status })
  }

  function undo() {
    if (!justSaved) return
    setMealStatus(today, justSaved.key, null)
    setJustSaved(null)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', padding: isMobile ? '12px 16px 24px' : '24px 8px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p style={{ fontSize: 15, color: 'var(--text-mid)' }}>{dayLabel} · {next ? 'next meal' : 'today'}</p>
          <h1 className="font-hand" style={{ fontSize: 38, fontWeight: 600, lineHeight: 1.1, marginTop: 4 }}>
            {next ? `${next.label}, ${shortTime(next.time)}` : "That's today done."}
          </h1>
        </div>
        <button onClick={() => setHelpOpen(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '8px 14px', flexShrink: 0,
          borderRadius: 'var(--radius)', border: '1.5px solid var(--ink)', background: 'white', color: 'var(--ink)',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}><Icon name="help" size={18} />Need help</button>
      </div>

      {justSaved && (
        <div role="status" className="nb-ink-settle" style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--ink-light)', borderColor: 'var(--ink-mid)' }}>
          <span style={{ fontSize: 15 }}>Saved: {justSaved.label}, {OUTCOME_META[justSaved.status].label.toLowerCase()}.</span>
          <button onClick={undo} style={{ minHeight: 44, padding: '0 12px', border: 'none', background: 'none', color: 'var(--ink)', fontSize: 15, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Undo</button>
        </div>
      )}

      {next ? (
        <>
          {(lastTime.length > 0 || challenges.length > 0) && (
            <section aria-labelledby="plate" style={card}>
              <h2 id="plate" style={h2}>For this {next.label.toLowerCase()}</h2>
              {lastTime.length > 0 && (
                <p style={{ fontSize: 15, color: 'var(--text-mid)' }}>
                  Last time: <span className="font-hand" style={{ fontSize: 17, color: 'var(--ink)' }}>{lastTime.map(f => f.name).join(', ')}</span>
                </p>
              )}
              {challenges.length > 0 && (
                <p style={{ marginTop: 10, padding: '8px 10px', background: 'var(--highlight)', color: 'var(--highlight-ink)', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 700 }}>
                  Challenge {challenges.length === 1 ? 'food' : 'foods'} this week: {challenges.join(', ')}
                </p>
              )}
            </section>
          )}

          <section aria-labelledby="table" style={card}>
            <h2 id="table" style={h2}>At the table</h2>
            {reminders.length > 0 ? (
              <>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.6 }}>
                  {reminders.map((r, i) => <li key={i}>{r}</li>)}
                </ol>
                <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 8 }}>Written by your clinician.</p>
              </>
            ) : (
              <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5 }}>
                Your clinician can add a few lines here to read at meal times. Ask about it at your next session.
              </p>
            )}
          </section>

          <section aria-labelledby="how">
            <h2 id="how" style={h2}>After {next.label.toLowerCase()}, tap how it went</h2>
            <div role="group" aria-labelledby="how" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {CHOICES.map(c => {
                const m = OUTCOME_META[c.status]
                return (
                  <button key={c.status} onClick={() => choose(c)} style={{
                    minHeight: 64, borderRadius: 'var(--radius)', border: '2px solid var(--border-mid)', background: 'white',
                    color: m.color, fontSize: 17, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}><OutcomeMark mark={m.mark} size={20} color="currentColor" />{m.label}</button>
                )
              })}
            </div>
          </section>
        </>
      ) : (
        <p style={{ fontSize: 16, color: 'var(--text-mid)', lineHeight: 1.5 }}>
          Every meal today has been written down. You can look back at the day or the week any time.
        </p>
      )}

      <Link to="/parent/daily" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, fontSize: 15, fontWeight: 600 }}>
        {logged > 0 ? `Today so far: ${logged} of 4 written down. Add what was served` : 'See all of today'}
      </Link>

      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { localIsoDate } from '../lib/constants'
import { NEXT_MEALS, pickNextMeal, shortTime, timeUntil } from '../lib/nextMeal'
import { sameAsYesterday } from '../lib/quickLog'
import { OUTCOME_META } from '../lib/outcomes'
import { loggerName } from '../lib/firestoreViews'
import { useAuth } from '../contexts/AuthContext'
import { CALM } from '../lib/supportCopy'
import { OutcomeMark } from '../components/Icon'
import HelpSheet from '../components/HelpSheet'

// The parent's home: a forest band with the one meal that matters now and how the day has gone
// so far, then what the care plan says about it, then one button to log it. Logging happens on
// its own screen (LogMealView) so the home stays calm.
const label13 = { fontSize: 13, fontWeight: 600, color: 'var(--ink)', padding: '18px 20px 6px' }

export default function NextMealView() {
  const { mealStatuses = {}, allMealItems = {}, setMealStatus } = useOutletContext()
  const { mealTimesByDate = {}, assignedChallenges = [], carePlan, mealLoggedBy = {}, caregivers = [] } = useFirebaseData()
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [justSaved, setJustSaved] = useState(() => location.state?.saved || null)
  const [helpOpen, setHelpOpen] = useState(false)

  // The "Saved" line arrives through navigation state; clear it so a reload doesn't show it again.
  useEffect(() => {
    if (location.state?.saved) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  const today = localIsoDate()
  const statuses = mealStatuses[today] || {}
  const times = mealTimesByDate[today] || {}
  const next = pickNextMeal({ statuses, times })
  const lastTime = next ? sameAsYesterday(allMealItems, today, next.key) : []
  const challenges = (Array.isArray(assignedChallenges) ? assignedChallenges : []).map(c => c.name).filter(Boolean)
  const reminders = carePlan?.tableReminders || []
  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
  const soon = next ? timeUntil(next.time) : ''
  const edge = isMobile
    ? { borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }
    : { border: '1px solid var(--rule)' }

  function undo() {
    if (!justSaved) return
    setMealStatus(today, justSaved.key, null)
    setJustSaved(null)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', paddingTop: isMobile ? 0 : 12, display: 'flex', flexDirection: 'column' }}>
      <section aria-labelledby="next-title" style={{ background: 'var(--ink)', color: 'var(--on-ink)', padding: '8px 20px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, color: 'var(--on-ink-soft)' }}>{dateLabel}</span>
          <button onClick={() => setHelpOpen(true)} style={{
            minHeight: 44, padding: '0 2px', border: 'none', background: 'none', color: 'var(--on-ink)',
            fontSize: 15, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer',
          }}>Get help</button>
        </div>
        <h1 id="next-title" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--on-ink)' }}>
          {next ? `${next.label} at ${shortTime(next.time)}` : "That's today done."}
        </h1>
        {soon && <p style={{ fontSize: 16, color: 'var(--on-ink-soft)', marginTop: 4 }}>{soon}</p>}

        <ol aria-label="Today's meals" style={{
          listStyle: 'none', margin: '18px 0 0', padding: '14px 0 0', borderTop: '1px solid rgba(250,249,246,0.22)',
          display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4,
        }}>
          {NEXT_MEALS.map(m => {
            const status = statuses[m.key]
            const isNext = next?.key === m.key
            const meta = OUTCOME_META[status]
            const mark = meta ? meta.mark : isNext ? 'next' : 'later'
            const word = meta ? meta.label : isNext ? 'Up next' : shortTime(times[m.key] || m.defaultTime)
            return (
              <li key={m.key} aria-current={isNext ? 'step' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <OutcomeMark mark={mark === 'later' ? 'none' : mark} size={18} color={mark === 'later' ? 'rgba(250,249,246,0.45)' : 'var(--on-ink)'} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{m.label}</span>
                <span style={{ fontSize: 13, color: isNext ? 'var(--apricot)' : 'var(--on-ink-soft)', fontWeight: isNext ? 600 : 400 }}>{word}</span>
                {status && mealLoggedBy[today]?.[m.key] && mealLoggedBy[today][m.key] !== user?.uid && (
                  <span style={{ fontSize: 12, lineHeight: 1.3, color: 'var(--on-ink-soft)', overflowWrap: 'anywhere' }}>
                    by {loggerName(mealLoggedBy[today][m.key], { uid: user?.uid, caregivers })}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      {justSaved && (
        <div role="status" className="nb-ink-settle" style={{ ...edge, borderTop: 'none', background: 'var(--ink-light)', padding: '6px 8px 6px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 15 }}>Saved: {justSaved.label}, {OUTCOME_META[justSaved.status]?.label.toLowerCase()}.</span>
          <button onClick={undo} style={{ minHeight: 44, padding: '0 12px', border: 'none', background: 'none', color: 'var(--ink)', fontSize: 15, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Undo</button>
        </div>
      )}

      {next ? (
        <>
          {(lastTime.length > 0 || challenges.length > 0) && (
            <section aria-labelledby="plate">
              <h2 id="plate" style={label13}>For {next.label.toLowerCase()}</h2>
              <div style={{ ...edge, background: 'white', paddingLeft: 20 }}>
                {lastTime.length > 0 && (
                  <p style={{ padding: '12px 20px 12px 0', fontSize: 17, lineHeight: 1.35, borderBottom: challenges.length ? '1px solid var(--rule)' : 'none' }}>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--text-light)' }}>Last time</span>
                    {lastTime.map(f => f.name).join(', ')}
                  </p>
                )}
                {challenges.length > 0 && (
                  <p style={{ padding: '12px 20px 12px 0', fontSize: 17, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span>Trying this week</span>
                    <span style={{ color: 'var(--text-light)', textAlign: 'right' }}>{challenges.join(', ')}</span>
                  </p>
                )}
              </div>
            </section>
          )}

          <section aria-labelledby="table" style={{ marginTop: 18, background: 'var(--ink-light)', padding: '14px 20px 16px' }}>
            <h2 id="table" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-hover)', marginBottom: 4 }}>At the table</h2>
            {reminders.length > 0 ? (
              <>
                {reminders.map((r, i) => (
                  <p key={i} style={{ padding: '8px 0', fontSize: 16, lineHeight: 1.4, borderBottom: '1px solid rgba(52,91,75,0.18)' }}>{r}</p>
                ))}
                <p style={{ fontSize: 13, color: 'var(--text-mid)', paddingTop: 10 }}>Written by your clinician.</p>
              </>
            ) : (
              <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, paddingTop: 4 }}>
                Your clinician can add a few lines here to read at meal times. Ask about it at your next session.
              </p>
            )}
          </section>

          <div style={{ padding: '16px 20px 4px' }}>
            <Link to={`/parent/next/log/${next.key}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: 'var(--radius)',
              background: 'var(--ink)', color: 'var(--on-ink)', fontSize: 17, fontWeight: 600, textDecoration: 'none',
            }}>Log {next.label.toLowerCase()}</Link>
            <Link to={`/parent/next/hard/${next.key}`} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 56, marginTop: 10,
              borderRadius: 'var(--radius)', border: '1.5px solid var(--ink-mid)', background: 'white', color: 'var(--ink)', textDecoration: 'none',
            }}>
              <span style={{ fontSize: 17, fontWeight: 600 }}>{CALM.entry}</span>
              <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{CALM.entryHint}</span>
            </Link>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 16, color: 'var(--text-mid)', lineHeight: 1.5, padding: '18px 20px 0' }}>
          Every meal today has been written down. You can look back at the day or the week any time.
        </p>
      )}

      <Link to="/parent/daily" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, fontSize: 15, fontWeight: 600 }}>
        See all of today
      </Link>

      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}

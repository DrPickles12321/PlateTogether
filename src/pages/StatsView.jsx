import { useMemo, useState, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { generateWeeklyInsights } from '../lib/aiInsights'
import { getWeekIsoDates } from '../lib/insights'
import { detectWeeklyAnomalies } from '../lib/anomalyDetection'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { buildSessionPrep } from '../lib/sessionPrep'
import { localIsoDate } from '../lib/constants'
import { OUTCOME_META } from '../lib/outcomes'
import { weekMessage } from '../lib/supportCopy'
import { byVisit, formatWeight } from '../lib/measurements'
import { OutcomeMark } from '../components/Icon'

function day(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

const sectionStyle = { padding: '18px 0', borderTop: '1px solid var(--rule)' }
const h2Style = { fontSize: 17, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 4 }
const leadStyle = { fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, marginBottom: 10 }

// A few kind words written by the AI from the week's logs. It goes through the Worker's safety
// layer; this page only shows it, after the facts, and says plainly when it is unavailable.
function AIInsightsSection({ weekStatuses, allMealItems = {}, mealStatuses = {}, mealTimesByDate = {} }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const loadedRef = useRef(false)

  const thisWeekItems = useMemo(() => {
    const weekDates = new Set(getWeekIsoDates(0))
    return Object.fromEntries(Object.entries(allMealItems).filter(([date]) => weekDates.has(date)))
  }, [allMealItems])

  const hasFoods = useMemo(
    () => Object.values(thisWeekItems).some(d => Object.values(d).flat().length > 0),
    [thisWeekItems]
  )

  function load() {
    const statusCounts = {
      okay: weekStatuses.filter(s => s.status === 'okay').length,
      difficult: weekStatuses.filter(s => s.status === 'difficult').length,
      refused: weekStatuses.filter(s => s.status === 'refused').length,
      skipped: weekStatuses.filter(s => s.status === 'skipped').length,
    }
    const anomalies = detectWeeklyAnomalies({ allMealItems, mealStatuses, mealTimesByDate })
    setLoading(true)
    setError(null)
    generateWeeklyInsights({ parentMealItemsByDate: thisWeekItems, mealLogs: statusCounts, anomalies })
      .then(result => { setInsights(result); setLoading(false) })
      .catch(err => { console.error('AI insights error:', err); setError(true); setLoading(false) })
  }

  useEffect(() => {
    if (hasFoods && !loadedRef.current) {
      loadedRef.current = true
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFoods])

  if (!loading && !error && !insights) return null

  return (
    <section style={sectionStyle} aria-busy={loading}>
      <h2 style={h2Style}>A few words about the week</h2>
      <p style={{ ...leadStyle, fontSize: 13 }}>Written by an AI assistant from what you logged. Not medical advice.</p>
      {loading && <p role="status" style={{ fontSize: 15, color: 'var(--text-mid)' }}>Writing a short note…</p>}
      {error && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, color: 'var(--text-mid)' }}>The assistant is not available right now. Your logs are saved.</span>
          <button onClick={load} style={{
            minHeight: 44, padding: '6px 14px', border: '1.5px solid var(--ink-mid)', borderRadius: 'var(--radius)',
            background: 'white', color: 'var(--ink)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>Try again</button>
        </div>
      )}
      {!loading && !error && insights && (
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
          {insights.map((item, i) => (
            <li key={i} style={{ fontSize: 15, color: 'var(--text-dark)', lineHeight: 1.6 }}>{item.text}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function StatsView() {
  const { mealStatuses = {}, allMealItems = {}, clinicianNotes = [] } = useOutletContext()
  const { mealTimesByDate = {}, mealDistress = {}, assignedChallenges = [], hiddenClinicianNoteIds = [], measurements = [], measurementsShared = false } = useFirebaseData()
  const sharedWeights = measurementsShared ? byVisit(measurements).filter(v => v.weight).slice(0, 6) : []
  const isMobile = useIsMobile()

  const thisWeekDates = useMemo(() => getWeekIsoDates(0), [])

  const thisWeekStatuses = useMemo(() => thisWeekDates.flatMap(date =>
    Object.entries(mealStatuses[date] || {}).map(([mealType, status]) => ({ date, mealType, status }))
  ), [mealStatuses, thisWeekDates])

  const prep = useMemo(() => buildSessionPrep({
    mealStatuses, mealDistress, allMealItems, isoDates: thisWeekDates, today: localIsoDate(),
  }), [mealStatuses, mealDistress, allMealItems, thisWeekDates])

  const latestNote = useMemo(() => [...clinicianNotes]
    .filter(n => !hiddenClinicianNoteIds.includes(n.id))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0] || null,
  [clinicianNotes, hiddenClinicianNoteIds])

  const challenges = Array.isArray(assignedChallenges) ? assignedChallenges : Object.values(assignedChallenges || {})

  return (
    <div style={{ padding: isMobile ? '12px 16px 24px' : '24px 8px', maxWidth: 680, margin: '0 auto', width: '100%' }}>
      <h1 className="font-hand" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.1 }}>This week</h1>
      <p style={{ fontSize: 17, color: 'var(--text-dark)', lineHeight: 1.5, margin: '8px 0 18px', maxWidth: '60ch' }}>
        {weekMessage({ logged: prep.logged, hard: prep.hardEntries.length })}
      </p>

      {latestNote && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>From your care team</h2>
          <blockquote className="font-hand" style={{
            margin: '8px 0 0', padding: '12px 14px', borderRadius: 'var(--radius)', background: 'white',
            border: '1px solid var(--rule-strong)', fontSize: 17, lineHeight: 1.5, color: 'var(--ink)',
          }}>{latestNote.body}</blockquote>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 6 }}>All notes are on the Notes page.</p>
        </section>
      )}

      {sharedWeights.length > 0 && (
        // Shown only when the lead therapist shares weight (roadmap D1): the visits' weights, plainly, with no
        // change figures or judgment. It stays off this page otherwise.
        <section style={sectionStyle}>
          <h2 style={h2Style}>Weight from clinic visits</h2>
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
            {sharedWeights.map(v => (
              <li key={v.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--rule)', fontSize: 16 }}>
                <span>{new Date(v.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span>{formatWeight(v.weight)}</span>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 6 }}>Shared by your clinician. Talk to them about what it means.</p>
        </section>
      )}

      <section style={sectionStyle}>
        <h2 style={h2Style}>Hard meals to mention at your next session</h2>
        {prep.hardEntries.length === 0 ? (
          <p style={leadStyle}>None written down this week.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {prep.hardEntries.map(e => {
              const m = OUTCOME_META[e.status]
              return (
                <li key={`${e.date}-${e.meal}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--rule)', fontSize: 15 }}>
                  <OutcomeMark mark={m.mark} size={18} color={m.color} />
                  <span><strong>{e.mealLabel}</strong>, {day(e.date)}</span>
                  <span style={{ marginLeft: 'auto', color: m.color, fontWeight: 700 }}>{m.label}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Challenge foods</h2>
        {challenges.length > 0 && (
          <p style={leadStyle}>From your clinician: {challenges.map(c => c.name).join(', ')}.</p>
        )}
        {prep.challengeAttempts.length === 0 ? (
          <p style={leadStyle}>No challenge foods tried yet this week.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.7 }}>
            {prep.challengeAttempts.map(a => (
              <li key={`${a.date}-${a.meal}-${a.name}`}>{a.name} at {a.mealLabel.toLowerCase()}, {day(a.date)}</li>
            ))}
          </ul>
        )}
      </section>

      <AIInsightsSection
        weekStatuses={thisWeekStatuses}
        allMealItems={allMealItems}
        mealStatuses={mealStatuses}
        mealTimesByDate={mealTimesByDate}
      />
    </div>
  )
}

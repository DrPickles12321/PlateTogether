import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { buildSessionSummary, datesSince, datesBefore } from '../lib/sessionSummary'
import { getWeekIsoDates } from '../lib/insights'
import { localIsoDate } from '../lib/constants'
import { OUTCOME_META, OUTCOME_ORDER } from '../lib/outcomes'
import { familyName, profileDetails } from '../lib/childProfile'
import { DEBRIEF } from '../lib/supportCopy'

// The family's week on one page, to read before a session or print for one. Its own route outside
// the clinician layout, so the printout has no sidebar or tabs. Facts from the family's logs only.
const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['snack', 'Snack'], ['dinner', 'Dinner']]
const dayShort = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const dayLong = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const word = status => (OUTCOME_META[status]?.label || '').toLowerCase()

const h2 = { fontSize: 17, fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 8px' }
const section = { padding: '18px 0', borderTop: '1px solid var(--rule)', breakInside: 'avoid' }
const body = { fontSize: 15, color: 'var(--text-dark)', lineHeight: 1.55, margin: 0 }
const muted = { fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5, margin: 0 }
const th = { textAlign: 'left', padding: '6px 8px', borderBottom: '1.5px solid var(--border-mid)', fontWeight: 700, color: 'var(--text-dark)', verticalAlign: 'bottom' }
const td = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--rule)', verticalAlign: 'top', lineHeight: 1.4 }
const linkBtn = { display: 'inline-flex', alignItems: 'center', minHeight: 44, textDecoration: 'none' }

export default function ClinicianSummary() {
  const {
    viewingPatientUid, patients, patientAccessDenied, childProfile,
    mealStatuses, mealDistress, allMealItems, parentNotesArray, hardMeals,
  } = useFirebaseData()
  const today = localIsoDate()
  const family = patients.find(p => p.uid === viewingPatientUid)
  const sinceDates = useMemo(() => datesSince(family?.lastSessionAt, today), [family?.lastSessionAt, today])
  // Which days the page covers. "since" is the default once a session has been marked.
  const [choice, setChoice] = useState(null)
  const range = choice || (sinceDates.length ? 'since' : 'week')

  const name = familyName(childProfile, family?.email)
  useEffect(() => { document.title = `Session summary · ${name} · Plate Together` }, [name])

  const isoDates = useMemo(() => (
    range === 'since' && sinceDates.length ? sinceDates : getWeekIsoDates(range === 'last' ? -1 : 0)
  ), [range, sinceDates])
  const summary = useMemo(() => buildSessionSummary({
    mealStatuses, mealDistress, allMealItems, parentNotes: parentNotesArray, hardMeals,
    isoDates, previousIsoDates: datesBefore(isoDates), today,
  }), [mealStatuses, mealDistress, allMealItems, parentNotesArray, hardMeals, isoDates, today])
  const ranges = [
    ...(sinceDates.length ? [['since', 'Since your last session']] : []),
    ['week', 'This week'],
    ['last', 'Last week'],
  ]

  if (!viewingPatientUid || patientAccessDenied) {
    return (
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>No family open</h1>
        <p style={{ ...muted, marginTop: 6 }}>
          {patientAccessDenied ? 'This family has removed your access.' : 'Open a family first, then come back to their summary.'}
        </p>
        <Link to="/clinician" className="clv-pill-btn" style={{ ...linkBtn, marginTop: 14 }}>Back to families</Link>
      </main>
    )
  }

  const { prep, days, notes, hardMeals: hardMealList } = summary
  const details = profileDetails(childProfile, today)
  const counted = OUTCOME_ORDER.filter(k => prep.counts[k])

  return (
    <main className="print-page" style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 48px', width: '100%', boxSizing: 'border-box' }}>
      <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
        <Link to="/clinician/overview" className="clv-pill-btn" style={linkBtn}>Back to the family</Link>
        <div role="group" aria-label="Days covered" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ranges.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setChoice(key)} aria-pressed={range === key}
              className={`clv-pill-btn${range === key ? ' filled' : ''}`} style={{ minHeight: 44 }}>{label}</button>
          ))}
        </div>
        <button type="button" onClick={() => window.print()} className="clv-pill-btn" style={{ minHeight: 44, marginLeft: 'auto' }}>Print</button>
      </div>

      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>Session summary</p>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '2px 0 0', overflowWrap: 'anywhere' }}>{name}</h1>
      {details && <p style={{ ...body, marginTop: 2 }}>{details}</p>}
      <p style={{ ...muted, marginTop: 6 }}>
        {range === 'since' && `Since your session on ${dayLong(family.lastSessionAt)}: `}
        {dayLong(isoDates[0])} to {dayLong(isoDates[isoDates.length - 1])}. From the family's own logs; not a clinical assessment.
      </p>

      <section style={{ ...section, marginTop: 16 }}>
        <h2 style={h2}>How meals went</h2>
        {prep.logged ? (
          <p style={body}>
            {counted.map(k => `${OUTCOME_META[k].label}: ${prep.counts[k]}`).join(' · ')}
            <span style={{ color: 'var(--text-mid)' }}>. {prep.logged} of {prep.totalSlots} meals logged so far.</span>
          </p>
        ) : <p style={muted}>Nothing logged in these days.</p>}
        {prep.hardestMeal && <p style={{ ...muted, marginTop: 4 }}>Hardest meal: {prep.hardestMeal.label.toLowerCase()} ({prep.hardestMeal.count}).</p>}
      </section>

      <section style={section}>
        <h2 style={h2}>Day by day</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th scope="col" style={th}>Day</th>
                {MEALS.map(([k, label]) => <th key={k} scope="col" style={th}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day.date}>
                  <th scope="row" style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{dayShort(day.date)}</th>
                  {MEALS.map(([k]) => {
                    const m = day.meals[k]
                    const hard = m.status === 'difficult' || m.status === 'refused'
                    return (
                      <td key={k} style={{ ...td, background: hard ? 'var(--highlight)' : undefined }}>
                        {m.status ? <span style={{ fontWeight: 600 }}>{OUTCOME_META[m.status]?.label}</span>
                          : <span style={{ color: 'var(--text-light)' }}>{day.date < today ? 'Not logged' : ''}</span>}
                        {m.foods.length > 0 && <span style={{ display: 'block', color: 'var(--text-mid)' }}>{m.foods.join(', ')}</span>}
                        {m.distress && (
                          <span style={{ display: 'block', color: 'var(--text-mid)' }}>
                            Distress {m.distress.pre ?? '–'} → {m.distress.post ?? '–'}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...muted, fontSize: 13, marginTop: 6 }}>Shaded: ate some or didn't eat. Distress is before → after the meal, 1 to 5, rated by the parent.</p>
      </section>

      <section style={section}>
        <h2 style={h2}>After hard meals</h2>
        {hardMealList.length ? (
          <ul style={{ ...body, listStyle: 'none', padding: 0 }}>
            {hardMealList.map(h => (
              <li key={h.key} style={{ padding: '6px 0', borderBottom: '1px solid var(--rule)' }}>
                <span style={{ fontWeight: 600 }}>{dayShort(h.date)}, {h.mealLabel.toLowerCase()}</span>
                {h.lines.map(line => (
                  <span key={line} style={{ display: 'block', color: line === DEBRIEF.clinician.worried ? 'var(--danger)' : 'var(--text-mid)', fontWeight: line === DEBRIEF.clinician.worried ? 600 : 400 }}>{line}</span>
                ))}
              </li>
            ))}
          </ul>
        ) : <p style={muted}>No calm-screen uses or debriefs in these days.</p>}
        <p style={{ ...muted, fontSize: 13, marginTop: 6 }}>Answers are the parent's own taps after a hard meal, in their words. Each was optional.</p>
      </section>

      <section style={section}>
        <h2 style={h2}>Challenge foods</h2>
        {prep.challengeAttempts.length ? (
          <ul style={{ ...body, paddingLeft: 18 }}>
            {prep.challengeAttempts.map(a => (
              <li key={`${a.date}-${a.meal}-${a.name}`}>{a.name}, {a.mealLabel.toLowerCase()} on {dayShort(a.date)}{a.status ? `: ${word(a.status)}` : ''}</li>
            ))}
          </ul>
        ) : <p style={muted}>No challenge foods logged in these days.</p>}
      </section>

      <section style={section}>
        <h2 style={h2}>Distress after meals</h2>
        {prep.distress.avgPost === null ? <p style={muted}>No ratings in these days.</p> : (
          <p style={body}>
            Average {prep.distress.avgPost} of 5
            {prep.distress.change ? `, ${prep.distress.change > 0 ? 'up' : 'down'} ${Math.abs(prep.distress.change)} from the same number of days before` : ''}.
          </p>
        )}
      </section>

      {prep.notLoggedDays.length > 0 && (
        <section style={section}>
          <h2 style={h2}>Days with nothing logged</h2>
          <p style={body}>{prep.notLoggedDays.map(dayShort).join(', ')}.</p>
        </section>
      )}

      <section style={section}>
        <h2 style={h2}>The parent's notes</h2>
        {notes.length ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {notes.map(n => (
              <li key={n.date}>
                <p style={{ ...muted, fontSize: 13, fontWeight: 600 }}>{dayShort(n.date)}</p>
                <p style={{ ...body, whiteSpace: 'pre-wrap' }}>{n.body}</p>
              </li>
            ))}
          </ul>
        ) : <p style={muted}>No notes in these days.</p>}
      </section>

      <section style={section}>
        <h2 style={h2}>Session notes</h2>
        {[0, 1, 2, 3, 4].map(i => <div key={i} style={{ borderBottom: '1px solid var(--border-mid)', height: 30 }} />)}
      </section>
    </main>
  )
}

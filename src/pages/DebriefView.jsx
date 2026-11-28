import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { NEXT_MEALS } from '../lib/nextMeal'
import { DEBRIEF_OPTIONS } from '../lib/events'
import { DEBRIEF, hardMealNote } from '../lib/supportCopy'
import Icon from '../components/Icon'
import HelpSheet from '../components/HelpSheet'
import WarningSignsCard from '../components/WarningSignsCard'

const QUESTIONS = ['hard', 'helped', 'parent']

// The debrief after a hard meal (roadmap C2): three questions, one tap each, each skippable, saved as one
// event for the clinician to read before the next session. Reached after the calm screen and after a refused
// meal. "Something worried me" opens the when-to-call guidance straight away instead of becoming a note.
export default function DebriefView() {
  const { date = '', meal = '' } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { saveDebrief } = useFirebaseData()
  const isMobile = useIsMobile()
  const mealInfo = NEXT_MEALS.find(m => m.key === meal)
  const [answers, setAnswers] = useState({ hard: null, helped: null, parent: null })
  const [step, setStep] = useState(0)
  const [worried, setWorried] = useState(false)
  const [result, setResult] = useState(null) // 'saved' | 'nothing'
  const [helpOpen, setHelpOpen] = useState(false)
  const savedOnce = useRef(false)

  if (!mealInfo || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return <Navigate to="/parent/next" replace />

  const key = QUESTIONS[step]
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  function finish(final) {
    if (savedOnce.current) return
    savedOnce.current = true
    const any = Object.values(final).some(v => v !== null)
    if (any) saveDebrief({ date, meal, value: final, ref: state?.hardMealRef })
    setResult(any ? 'saved' : 'nothing')
  }

  function answer(value) {
    const next = { ...answers, [key]: value }
    setAnswers(next)
    if (key === 'hard' && value === 'worried') { setWorried(true); return }
    advance(next)
  }

  function advance(current = answers) {
    setWorried(false)
    if (step < QUESTIONS.length - 1) setStep(step + 1)
    else finish(current)
  }

  const edge = isMobile
    ? { borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }
    : { border: '1px solid var(--rule)' }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', paddingTop: isMobile ? 0 : 12, display: 'flex', flexDirection: 'column' }}>
      <section style={{ background: 'var(--ink-light)', padding: '4px 20px 16px' }}>
        <Link to="/parent/next" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, minHeight: 44, marginLeft: -6, color: 'var(--text-dark)', fontSize: 16, textDecoration: 'none' }}>
          <Icon name="left" size={20} />Next meal
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: 2 }}>{DEBRIEF.title(mealInfo.label)}</h1>
        <p style={{ fontSize: 16, lineHeight: 1.45, color: 'var(--text-mid)', marginTop: 6 }}>{DEBRIEF.intro}</p>
      </section>

      {result ? (
        <section role="status" style={{ padding: '20px 20px 0' }}>
          <p style={{ fontSize: 18, lineHeight: 1.45, fontWeight: 600 }}>{result === 'saved' ? DEBRIEF.saved : DEBRIEF.nothingSaved}</p>
          {answers.parent === 'need_support' && (
            <button onClick={() => setHelpOpen(true)} style={{ ...primary, width: '100%', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="message" size={18} />{DEBRIEF.supportAction}
            </button>
          )}
          <button onClick={() => navigate('/parent/next')} style={{ ...(answers.parent === 'need_support' ? secondary : primary), width: '100%', marginTop: 10 }}>{DEBRIEF.done}</button>
        </section>
      ) : worried ? (
        <section aria-labelledby="worried" style={{ padding: '18px 20px 0' }}>
          <h2 id="worried" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{DEBRIEF.worriedTitle}</h2>
          <WarningSignsCard />
          <button onClick={() => advance()} style={{ ...secondary, width: '100%', marginTop: 16 }}>{DEBRIEF.continue}</button>
        </section>
      ) : (
        <section aria-labelledby="question">
          <p style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '18px 20px 8px' }}>
            <span id="question" style={{ fontSize: 20, fontWeight: 700 }}>{DEBRIEF.questions[key]}</span>
            <span style={{ fontSize: 14, color: 'var(--text-light)' }}>{DEBRIEF.step(step, QUESTIONS.length)}</span>
          </p>
          <div role="group" aria-labelledby="question" style={{ ...edge, background: 'white', paddingLeft: 20 }}>
            {DEBRIEF_OPTIONS[key].map((value, i, all) => (
              <button key={value} type="button" onClick={() => answer(value)} style={{
                display: 'block', width: '100%', minHeight: 56, padding: '10px 20px 10px 0', textAlign: 'left',
                border: 'none', borderBottom: i < all.length - 1 ? '1px solid var(--rule)' : 'none',
                background: 'transparent', color: 'var(--text-dark)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{ display: 'block', fontSize: 17, fontWeight: 500 }}>{DEBRIEF.options[key][value]}</span>
                {value === 'worried' && <span style={{ display: 'block', fontSize: 14, color: 'var(--text-light)', marginTop: 2 }}>{DEBRIEF.worriedHint}</span>}
              </button>
            ))}
          </div>
          <div style={{ padding: '12px 20px 0' }}>
            <button onClick={() => advance()} style={{ ...secondary, width: '100%' }}>{DEBRIEF.skip}</button>
          </div>
        </section>
      )}

      <HelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        defaultNote={`${hardMealNote({ mealLabel: mealInfo.label, dateLabel })} ${DEBRIEF.supportNote}`}
      />
    </div>
  )
}

const primary = {
  minHeight: 52, padding: '0 18px', border: 'none', borderRadius: 'var(--radius)',
  background: 'var(--ink)', color: 'var(--on-ink)', fontSize: 17, fontWeight: 600, cursor: 'pointer',
}
const secondary = {
  minHeight: 52, padding: '0 18px', border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)',
  background: 'white', color: 'var(--text-dark)', fontSize: 17, fontWeight: 600, cursor: 'pointer',
}

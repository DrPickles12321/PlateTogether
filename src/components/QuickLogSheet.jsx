import BottomSheet from './BottomSheet'
import { OUTCOMES, DIFFICULTY_LEVELS, STATUS_TO_OUTCOME } from '../lib/quickLog'

// Same sage-to-terracotta ramp as DistressScale so the two read as one scale.
const LEVEL_COLORS = ['var(--mint)', 'var(--mint)', 'var(--st-some)', 'var(--ink)', 'var(--ink)']
const OUTCOME_STYLE = {
  finished: { color: 'var(--mint)', bg: 'var(--mint-light)', border: 'var(--mint-mid)' },
  partly:   { color: 'var(--st-some)', bg: 'var(--st-some-bg)', border: 'var(--peach-mid)' },
  refused:  { color: 'var(--st-refused)', bg: 'var(--st-refused-bg)', border: 'var(--pink-mid)' },
}

// Tap 1 (the Log button on a meal card) opens this. Tap 2 is how it went and is
// saved immediately. Tap 3 is how hard it was; it saves and closes the sheet.
export default function QuickLogSheet({ open, meal, status, difficulty, onOutcome, onDifficulty, onClose }) {
  const outcome = STATUS_TO_OUTCOME[status] || null

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={meal ? `Log ${meal.label}` : 'Log meal'}
      footer={
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: 13, borderRadius: 13, border: '1.5px solid var(--border-mid)',
            background: 'white', color: 'var(--text-mid)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', minHeight: 48, fontFamily: "var(--font-ui)",
          }}
        >Done</button>
      }
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 8 }}>How did it go?</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {OUTCOMES.map(o => {
          const s = OUTCOME_STYLE[o.key]
          const selected = outcome === o.key
          return (
            <button
              key={o.key}
              onClick={() => onOutcome(o.key)}
              aria-pressed={selected}
              style={{
                flex: 1, minHeight: 56, borderRadius: 14, fontSize: 15, fontWeight: 600,
                border: `2px solid ${selected ? s.color : s.border}`,
                background: selected ? s.bg : 'white', color: s.color,
                cursor: 'pointer', fontFamily: "var(--font-ui)",
                WebkitTapHighlightColor: 'transparent',
              }}
            >{o.label}</button>
          )
        })}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 8 }}>How hard was it?</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        {DIFFICULTY_LEVELS.map(level => {
          const selected = difficulty === level
          const color = LEVEL_COLORS[level - 1]
          return (
            <button
              key={level}
              onClick={() => onDifficulty(level)}
              aria-pressed={selected}
              aria-label={`Difficulty ${level} of 5${level === 1 ? ', calm' : level === 5 ? ', very hard' : ''}`}
              style={{
                flex: 1, minHeight: 52, borderRadius: 14, fontSize: 17, fontWeight: 700,
                border: `2px solid ${selected ? color : 'var(--border-mid)'}`,
                background: selected ? color : 'white', color: selected ? 'white' : 'var(--text-mid)',
                cursor: 'pointer', fontFamily: "var(--font-ui)",
                WebkitTapHighlightColor: 'transparent',
              }}
            >{level}</button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-light)', marginTop: 6 }}>
        <span>Calm</span><span>Very hard</span>
      </div>
    </BottomSheet>
  )
}

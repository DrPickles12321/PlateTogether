import BottomSheet from './BottomSheet'
import { OutcomeMark } from './Icon'
import { OUTCOMES, DIFFICULTY_LEVELS, STATUS_TO_OUTCOME } from '../lib/quickLog'
import { OUTCOME_META } from '../lib/outcomes'

// Tap 1 (the Log button on a meal line) opens this. Tap 2 is how it went and is saved
// immediately. Tap 3 is how hard it was; it saves and closes the sheet.
export default function QuickLogSheet({ open, meal, status, difficulty, onOutcome, onDifficulty, onClose }) {
  const outcome = STATUS_TO_OUTCOME[status] || null

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={meal ? `Log ${meal.label.toLowerCase()}` : 'Log meal'}
      footer={
        <button
          onClick={onClose}
          style={{
            width: '100%', minHeight: 48, borderRadius: 'var(--radius)', border: '1.5px solid var(--border-mid)',
            background: 'white', color: 'var(--text-dark)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >Done</button>
      }
    >
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 8 }}>How did it go?</h3>
      <div role="group" aria-label="How did it go?" style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        {OUTCOMES.map(o => {
          const m = OUTCOME_META[o.status]
          const selected = outcome === o.key
          return (
            <button
              key={o.key}
              onClick={() => onOutcome(o.key)}
              aria-pressed={selected}
              style={{
                flex: 1, minHeight: 64, borderRadius: 'var(--radius)', fontSize: 16, fontWeight: 700,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                border: `2px solid ${selected ? m.color : 'var(--border-mid)'}`,
                background: selected ? m.bg : 'white', color: m.color,
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}
            ><OutcomeMark mark={m.mark} size={20} color="currentColor" />{o.label}</button>
          )
        })}
      </div>
      <p role="status" style={{ fontSize: 14, color: 'var(--text-mid)', minHeight: 20, marginBottom: 14 }}>
        {outcome ? 'Saved.' : ''}
      </p>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 8 }}>How hard was it? <span style={{ fontWeight: 400, color: 'var(--text-mid)' }}>(optional)</span></h3>
      <div role="group" aria-label="How hard was it?" style={{ display: 'flex', gap: 6 }}>
        {DIFFICULTY_LEVELS.map(level => {
          const selected = difficulty === level
          return (
            <button
              key={level}
              onClick={() => onDifficulty(level)}
              aria-pressed={selected}
              aria-label={`${level} of 5${level === 1 ? ', calm' : level === 5 ? ', very hard' : ''}`}
              style={{
                flex: 1, minHeight: 52, borderRadius: 'var(--radius)', fontSize: 17, fontWeight: 700,
                border: `2px solid ${selected ? 'var(--ink)' : 'var(--border-mid)'}`,
                background: selected ? 'var(--ink)' : 'white', color: selected ? 'white' : 'var(--text-dark)',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}
            >{level}</button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-mid)', marginTop: 6 }}>
        <span>Calm</span><span>Very hard</span>
      </div>
    </BottomSheet>
  )
}

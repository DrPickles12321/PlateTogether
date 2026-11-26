// Pre/post-meal distress rating (1 calm → 5 very hard). Two rows shown once a meal has a status;
// tapping the selected value again clears it. One selection colour for every level on purpose:
// the number carries the meaning, and a red "5" would read as a verdict on the family.

const LEVELS = [1, 2, 3, 4, 5]

function ScaleRow({ label, value, onSet }) {
  return (
    <div role="group" aria-label={label}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {LEVELS.map(lv => {
          const selected = value === lv
          return (
            <button
              key={lv}
              type="button"
              onClick={() => onSet(selected ? null : lv)}
              aria-pressed={selected}
              aria-label={`${lv} of 5${lv === 1 ? ', calm' : lv === 5 ? ', very hard' : ''}`}
              style={{
                flex: 1, minWidth: 44, minHeight: 44, padding: 0, borderRadius: 'var(--radius)',
                border: `1.5px solid ${selected ? 'var(--ink)' : 'var(--border-mid)'}`,
                background: selected ? 'var(--ink)' : 'white',
                color: selected ? 'white' : 'var(--text-dark)',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >{lv}</button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-mid)', marginTop: 4 }}>
        <span>Calm</span><span>Very hard</span>
      </div>
    </div>
  )
}

export default function DistressScale({ distress, onSet }) {
  return (
    <div style={{
      borderTop: '1px solid var(--rule)', paddingTop: 12,
      display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420,
    }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)' }}>How hard was this meal?</div>
        <div style={{ fontSize: 14, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.45 }}>
          Optional. 1 is calm, 5 is very hard.
        </div>
      </div>
      <ScaleRow label="Before eating" value={distress?.pre ?? null} onSet={v => onSet({ pre: v })} />
      <ScaleRow label="After eating" value={distress?.post ?? null} onSet={v => onSet({ post: v })} />
    </div>
  )
}

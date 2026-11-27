// The clinician's families, most in need first (lib/familyTriage.js), each with the reason in plain
// words. Selecting one opens that family's file.
const MARK = {
  3: { background: 'var(--danger)' },          // asked for support
  2: { background: 'var(--apricot)' },         // meals not eaten this week
  1: { background: 'var(--ink-mid)' },         // unread notes, or quiet for a few days
  0: { background: 'transparent', border: '1.5px solid var(--border-mid)' },
}

export default function FamilyList({ families, selectedUid, onSelect }) {
  if (!families.length) {
    return <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5, padding: '12px 16px' }}>No families yet. Add one with their family code below.</p>
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--rule)' }}>
      {families.map(f => {
        const on = f.uid === selectedUid
        return (
          <li key={f.uid} style={{ borderBottom: '1px solid var(--rule)' }}>
            <button type="button" onClick={() => onSelect(f.uid)} aria-current={on ? 'true' : undefined} style={{
              width: '100%', minHeight: 60, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px',
              border: 'none', borderLeft: `3px solid ${on ? 'var(--ink)' : 'transparent'}`, cursor: 'pointer', textAlign: 'left',
              background: on ? 'var(--ink-light)' : 'white', color: 'var(--text-dark)',
            }}>
              <span aria-hidden="true" style={{ flexShrink: 0, width: 10, height: 10, borderRadius: '50%', marginTop: 6, boxSizing: 'border-box', ...MARK[f.summary.priority] }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600, overflowWrap: 'anywhere' }}>{f.name}</span>
                <span style={{ display: 'block', fontSize: 13, color: f.summary.priority >= 2 ? 'var(--highlight-ink)' : 'var(--text-light)', marginTop: 2 }}>
                  {f.summary.reasons.length ? f.summary.reasons.join(' · ') : f.summary.reason}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

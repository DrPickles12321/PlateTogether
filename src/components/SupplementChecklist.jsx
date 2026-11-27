import Icon from './Icon'

// Today's prescribed supplements as a plain checklist: one row per supplement, a round tick button
// and the name, hairlines between rows. (Replaces the ruled-notebook card, whose lines didn't line
// up with the text.)
export default function SupplementChecklist({ checkedSupplements, onToggleChecked, prescribedSupplements = [] }) {
  return (
    <section aria-labelledby="supplements-title" style={{ background: 'white', border: '1px solid var(--rule)', marginTop: 14 }}>
      <h3 id="supplements-title" style={{ padding: '12px 14px 8px', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
        Daily supplements
      </h3>

      {prescribedSupplements.length === 0 ? (
        <p style={{ padding: '10px 14px 12px', borderTop: '1px solid var(--rule)', fontSize: 14, color: 'var(--text-light)' }}>
          No supplements prescribed yet.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--rule)' }}>
          {prescribedSupplements.map((name, i) => {
            const checked = !!checkedSupplements?.has(name)
            return (
              <li key={name} style={{ borderBottom: i < prescribedSupplements.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                <button type="button" onClick={() => onToggleChecked?.(name)} aria-pressed={checked} style={{
                  width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px',
                  border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer',
                }}>
                  <span aria-hidden="true" style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: checked ? 'none' : '1.5px solid var(--border-mid)', background: checked ? 'var(--ink)' : 'transparent', color: 'var(--on-ink)',
                  }}>{checked && <Icon name="tick" size={14} strokeWidth={2.6} />}</span>
                  <span style={{ fontSize: 15, color: checked ? 'var(--text-light)' : 'var(--text-dark)' }}>{name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <p style={{ padding: '8px 14px 10px', borderTop: '1px solid var(--rule)', fontSize: 12, color: 'var(--text-light)' }}>
        Not a substitute for medical advice. Resets each day.
      </p>
    </section>
  )
}

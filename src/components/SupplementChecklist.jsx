export default function SupplementChecklist({ checkedSupplements, onToggleChecked, prescribedSupplements = [] }) {
  const items = prescribedSupplements.length > 0
    ? prescribedSupplements.map(name => ({ nutrient: name }))
    : []

  return (
    <div style={{ position: 'relative', paddingTop: 14 }}>

      {/* Notebook card */}
      <div style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 14px 8px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--coral)', fontFamily: "var(--font-ui)" }}>
            Daily Supplements
          </span>
        </div>

        {/* Ruled content with margin line */}
        <div style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, var(--border) 27px, var(--border) 28px)',
          backgroundSize: '100% 28px',
          backgroundPositionY: '4px',
          padding: '10px 12px 12px 0',
          display: 'flex',
        }}>
          {/* Red margin line */}
          <div style={{ width: 1, background: 'var(--margin)', flexShrink: 0, marginLeft: 12, marginRight: 10 }} />

          {/* Items */}
          <div style={{ flex: 1 }}>
            {items.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic', padding: '4px 0', lineHeight: '28px' }}>
                No supplements prescribed yet.
              </p>
            ) : items.map((rec, i) => {
              const checked = checkedSupplements?.has(rec.nutrient)
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  height: 28,
                }}>
                  <button
                    onClick={() => onToggleChecked?.(rec.nutrient)}
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: `1.5px solid var(--coral)`,
                      background: checked ? 'var(--coral)' : 'transparent',
                      cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                      transition: 'all 0.15s',
                    }}
                    aria-label={`Toggle ${rec.nutrient}`}
                  >
                    {checked && <span style={{ color: 'white', fontSize: 12, lineHeight: 1, fontWeight: 700 }}><Icon name="tick" size={14} /></span>}
                  </button>
                  <span style={{
                    fontSize: 12, color: checked ? 'var(--text-light)' : 'var(--text-dark)',
                    textDecoration: checked ? 'line-through' : 'none',
                    fontFamily: "var(--font-ui)",
                    transition: 'all 0.15s',
                  }}>{rec.nutrient}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '6px 12px 8px',
          borderTop: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-light)',
          fontStyle: 'italic', lineHeight: 1.4,
          fontFamily: "var(--font-ui)",
        }}>
          Not a substitute for medical advice · Resets daily
        </div>
      </div>
    </div>
  )
}

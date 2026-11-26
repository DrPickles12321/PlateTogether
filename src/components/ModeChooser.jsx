import { APP_MODES, testModeEnabled } from '../lib/appMode'
import { useAppMode } from '../hooks/useAppMode'

// Testing aid: pick which kind of app to try. Hidden for ordinary visitors.
export default function ModeChooser() {
  const { mode, setMode } = useAppMode()
  if (!testModeEnabled({ dev: import.meta.env.DEV, search: window.location.search })) return null

  return (
    <div style={{ marginBottom: 18, padding: 12, borderRadius: 'var(--radius)', background: 'var(--surface-warm)', border: '1px dashed var(--border-mid)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 8 }}>
        For testing: which version of the app
      </div>
      <div role="radiogroup" aria-label="Type of app" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {APP_MODES.map(m => {
          const selected = mode === m.key
          return (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(m.key)}
              style={{
                textAlign: 'left', padding: '10px 12px', minHeight: 48, borderRadius: 'var(--radius)', cursor: 'pointer',
                border: `1.5px solid ${selected ? 'var(--coral)' : 'var(--border)'}`,
                background: selected ? 'var(--coral-light)' : 'white',
                fontFamily: "var(--font-ui)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' }}>{m.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{m.blurb}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

import { useState } from 'react'

// The clinician's switch for whether this family's parent sees nutrition numbers (calories,
// protein and so on). Clinicians always see them. Until the clinician chooses, the app's default
// applies (the anorexia version hides them).
export default function NutritionDisplaySwitch({ setting, onChange }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const chosen = typeof setting?.showToParent === 'boolean'
  const on = chosen ? setting.showToParent : false

  async function toggle() {
    setError('')
    setSaving(true)
    try {
      await onChange(!on)
    } catch {
      setError("Couldn't save. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p id="numbers-label" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-dark)' }}>Show nutrition numbers to the parent</p>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.45 }}>
            Calories, protein, carbs and fat on the parent's screens. You always see them.
          </p>
        </div>
        <button type="button" role="switch" aria-checked={on} aria-labelledby="numbers-label" onClick={toggle} disabled={saving} style={{
          flexShrink: 0, width: 52, height: 32, borderRadius: 16, padding: 3, border: 'none', cursor: saving ? 'wait' : 'pointer',
          background: on ? 'var(--ink)' : 'var(--border-mid)', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start',
        }}>
          <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: '50%', background: 'white', display: 'block' }} />
        </button>
      </div>
      <p role="status" style={{ fontSize: 13, color: error ? 'var(--highlight-ink)' : 'var(--text-light)', marginTop: 8 }}>
        {error || (chosen
          ? (on ? 'On: the parent sees nutrition numbers.' : 'Off: the parent does not see nutrition numbers.')
          : 'Not set yet: the app default applies (hidden in the anorexia version).')}
      </p>
    </div>
  )
}

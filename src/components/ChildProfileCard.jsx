import { useState } from 'react'
import { cleanProfileInput, profileDetails, PHASES, NAME_MAX } from '../lib/childProfile'
import { localIsoDate } from '../lib/constants'

const label = { display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }
const hint = { fontSize: 13, color: 'var(--text-light)', margin: '2px 0 0' }
const input = {
  width: '100%', minHeight: 44, padding: '8px 12px', borderRadius: 'var(--radius)',
  border: '1.5px solid var(--border-mid)', fontSize: 16, color: 'var(--text-dark)', background: 'white', boxSizing: 'border-box',
}

// The parent tells the care team who they are feeding. Clinicians see this name instead of the
// parent's email. The phase is set by the clinician and only shown here.
export default function ChildProfileCard({ profile, onSave }) {
  const today = localIsoDate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => toForm(profile))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // With no name yet the form is the only thing to show; it stays open until a save.
  const showForm = editing || !profile?.name

  function startEditing() {
    setForm(toForm(profile))
    setError('')
    setEditing(true)
  }

  async function submit(e) {
    e.preventDefault()
    const result = cleanProfileInput(form, today)
    if (result.error) { setError(result.error); return }
    setSaving(true)
    try {
      await onSave(result.value)
      setEditing(false)
    } catch {
      setError('Couldn’t save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const phase = PHASES[profile?.phase]
  const details = profileDetails(profile, today)

  return (
    <section aria-labelledby="child-profile-title" style={{ marginBottom: 24 }}>
      <h2 id="child-profile-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 6 }}>Your child</h2>

      {!showForm ? (
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{profile.name}</p>
          {details && <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '2px 0 0' }}>{details}</p>}
          <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5, margin: '8px 0 12px' }}>
            {phase ? `${phase}. Your clinician sets this.` : 'Your clinician will set the treatment phase.'}
          </p>
          <button type="button" onClick={startEditing} className="clv-pill-btn" style={{ minHeight: 44 }}>Edit</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, margin: '0 0 14px' }}>
            Your care team sees this name instead of your email. A first name or initials is enough.
          </p>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="child-name" style={label}>First name or initials</label>
            <input id="child-name" value={form.name} maxLength={NAME_MAX} autoComplete="off"
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={input} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ flex: '1 1 120px' }}>
              <label htmlFor="child-birth-year" style={label}>Birth year</label>
              <input id="child-birth-year" value={form.birthYear} inputMode="numeric" maxLength={4} autoComplete="off"
                aria-describedby="child-birth-year-hint"
                onChange={e => setForm(f => ({ ...f, birthYear: e.target.value.replace(/\D/g, '') }))} style={input} />
              <p id="child-birth-year-hint" style={hint}>Optional</p>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label htmlFor="child-start" style={label}>Treatment started</label>
              <input id="child-start" type="date" value={form.treatmentStart} max={today}
                aria-describedby="child-start-hint"
                onChange={e => setForm(f => ({ ...f, treatmentStart: e.target.value }))} style={input} />
              <p id="child-start-hint" style={hint}>Optional</p>
            </div>
          </div>
          {error && <p role="alert" style={{ fontSize: 14, color: 'var(--st-refused)', margin: '0 0 10px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} className="clv-pill-btn filled" style={{ minHeight: 44 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {profile?.name && (
              <button type="button" onClick={() => setEditing(false)} className="clv-pill-btn" style={{ minHeight: 44 }}>Cancel</button>
            )}
          </div>
        </form>
      )}
    </section>
  )
}

function toForm(profile) {
  return {
    name: profile?.name || '',
    birthYear: profile?.birthYear ? String(profile.birthYear) : '',
    treatmentStart: profile?.treatmentStart || '',
  }
}

import { useMemo, useState } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { SectionCard } from '../pages/ClinicianView'
import { byVisit } from '../lib/measurements'
import { earlyResponse, earlyResponseConfig, earlyResponseText } from '../lib/earlyResponse'

// Early response for the clinician (roadmap D2): on track by session 4 or not, the numbers behind it, and a
// threshold this clinician can change. Never shown to the family. The app reports; the clinician decides.
const tone = { onTrack: 'var(--ink)', below: 'var(--st-refused)' }

export default function EarlyResponseCard() {
  const { measurements, familySessions, earlyResponseSettings, saveEarlyResponseSettings } = useFirebaseData()
  const result = useMemo(
    () => earlyResponse({ visits: byVisit(measurements), sessions: familySessions, config: earlyResponseSettings }),
    [measurements, familySessions, earlyResponseSettings],
  )
  const config = result.config
  const { headline, evidence } = earlyResponseText(result)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const d = draft || { mode: config.mode, kg: String(config.kg), ibwKg: config.ibwKg ? String(config.ibwKg) : '', priorSessions: String(config.priorSessions) }
  const set = key => e => setDraft({ ...d, [key]: e.target.value })

  function save(e) {
    e.preventDefault()
    saveEarlyResponseSettings(earlyResponseConfig({ ...config, mode: d.mode, kg: d.kg, ibwKg: d.ibwKg || null, priorSessions: d.priorSessions }))
    setEditing(false)
    setDraft(null)
  }

  return (
    <SectionCard>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)', marginBottom: 2 }}>Early response</div>
      <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '0 0 12px' }}>
        For the care team only. Early weight gain is linked with later remission in FBT; this is a prompt to review, not a verdict.
      </p>
      <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: tone[result.status] || 'var(--text-dark)' }}>{headline}</p>
      {evidence.length > 0 && (
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5 }}>
          {evidence.map(line => <li key={line}>{line}</li>)}
        </ul>
      )}
      <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 8, lineHeight: 1.5 }}>
        Sessions are the ones marked with "Session done today". Weights come from clinic visits below.
      </p>

      {editing ? (
        <form onSubmit={save} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rule)', display: 'grid', gap: 10, fontSize: 14 }}>
          <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            <legend style={{ fontWeight: 600, marginBottom: 4 }}>Threshold by session {config.bySession}</legend>
            <label style={row}>
              <input type="radio" name="er-mode" checked={d.mode === 'kg'} onChange={() => setDraft({ ...d, mode: 'kg' })} />
              Kilograms gained:
              <input inputMode="decimal" value={d.kg} onChange={set('kg')} aria-label="Kilograms gained" style={{ ...input, width: 70 }} /> kg
            </label>
            <label style={row}>
              <input type="radio" name="er-mode" checked={d.mode === 'ibw'} onChange={() => setDraft({ ...d, mode: 'ibw' })} />
              {config.pct}% of ideal body weight:
              <input inputMode="decimal" value={d.ibwKg} onChange={set('ibwKg')} aria-label="Ideal body weight in kg" placeholder="kg" style={{ ...input, width: 70 }} /> kg
            </label>
          </fieldset>
          <label style={row}>
            Sessions held before Plate Together:
            <input inputMode="numeric" value={d.priorSessions} onChange={set('priorSessions')} aria-label="Sessions before Plate Together" style={{ ...input, width: 60 }} />
          </label>
          <p style={{ fontSize: 12, color: 'var(--text-light)', lineHeight: 1.5 }}>
            Defaults from the research: 2.88% of ideal body weight by session 4 (Doyle et al.), and about 2.3 to 2.8 kg by
            sessions 3 to 5. Saved for you, for this family.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="clv-pill-btn" style={{ minHeight: 44 }}>Save</button>
            <button type="button" onClick={() => { setEditing(false); setDraft(null) }} style={{ minHeight: 44, border: 'none', background: 'none', color: 'var(--text-mid)', cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setEditing(true)} style={{
          minHeight: 44, marginTop: 6, padding: 0, border: 'none', background: 'none', color: 'var(--ink)',
          fontSize: 14, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer',
        }}>Change threshold</button>
      )}
    </SectionCard>
  )
}

const row = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
const input = { minHeight: 40, padding: '0 8px', borderRadius: 'var(--radius)', border: '1.5px solid var(--border-mid)', fontSize: 15, background: 'white', boxSizing: 'border-box' }

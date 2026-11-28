import { useMemo, useState } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { SectionCard } from '../pages/ClinicianView'
import { localIsoDate } from '../lib/constants'
import { readingsFromForm, byVisit, weightChange, formatWeight, formatSigned } from '../lib/measurements'

// Clinic measurements for the clinician (roadmap D1): type in weight and vitals from a visit, see past visits
// and weight change. Readings can't be edited or deleted (they are part of the record); a slip is fixed by
// entering the visit again, and the later entry counts. Only the lead therapist decides whether the parents
// see weight. Nothing here is advice or a judgment about the numbers.
const day = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const EMPTY = { weight: '', weightUnit: 'kg', heartRate: '', bpSys: '', bpDia: '' }

export default function MeasurementsCard() {
  const { measurements, measurementsShared, isLeadClinician, addMeasurements, setMeasurementsShared } = useFirebaseData()
  const [form, setForm] = useState({ date: localIsoDate(), ...EMPTY })
  const [status, setStatus] = useState(null) // { error } | { saved }
  const [busy, setBusy] = useState(false)
  const visits = useMemo(() => byVisit(measurements), [measurements])
  const change = weightChange(visits)
  const latestWeight = visits.find(v => v.weight)
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    const { readings, error } = readingsFromForm(form)
    if (error) { setStatus({ error }); return }
    setBusy(true)
    const ok = await addMeasurements(readings)
    setBusy(false)
    if (ok) { setForm(f => ({ ...f, ...EMPTY, weightUnit: f.weightUnit })); setStatus({ saved: true }) }
    else setStatus({ error: "Couldn't save. Check your connection and try again." })
  }

  return (
    <SectionCard>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)', marginBottom: 2 }}>Clinic measurements</div>
      <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '0 0 14px' }}>
        From visits, for the care team. {measurementsShared ? 'The parents can see weight.' : 'Not shared with the family.'} The teen never sees these.
      </p>

      {latestWeight && (
        <p style={{ fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.5, margin: '0 0 12px' }}>
          Weight {formatWeight(latestWeight.weight)} on {day(latestWeight.date)}
          {change && <span style={{ color: 'var(--text-mid)' }}>: {formatSigned(change.sincePrevious.value)} {change.unit} since {day(change.sincePrevious.date)}{change.sinceFirst.date !== change.sincePrevious.date && `, ${formatSigned(change.sinceFirst.value)} ${change.unit} since ${day(change.sinceFirst.date)}`}</span>}.
        </p>
      )}

      {visits.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table style={{ width: '100%', minWidth: 360, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Visit', 'Weight', 'Heart rate', 'Blood pressure'].map(h => <th key={h} scope="col" style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {visits.slice(0, 8).map(v => (
                <tr key={v.date}>
                  <th scope="row" style={{ ...td, fontWeight: 600 }}>{day(v.date)}</th>
                  <td style={td}>{formatWeight(v.weight) || '–'}</td>
                  <td style={td}>{v.heartRate ? `${v.heartRate.value} bpm` : '–'}</td>
                  <td style={td}>{v.bloodPressure ? `${v.bloodPressure.sys} / ${v.bloodPressure.dia}` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={save} style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <label style={label}>Visit date
            <input type="date" value={form.date} max={localIsoDate()} onChange={set('date')} style={input} />
          </label>
          <label style={label}>Weight
            <span style={{ display: 'flex', gap: 6 }}>
              <input inputMode="decimal" value={form.weight} onChange={set('weight')} placeholder="–" style={{ ...input, width: 80 }} />
              <select value={form.weightUnit} onChange={set('weightUnit')} aria-label="Weight unit" style={{ ...input, width: 70 }}>
                <option value="kg">kg</option><option value="lb">lb</option>
              </select>
            </span>
          </label>
          <label style={label}>Heart rate (bpm)
            <input inputMode="numeric" value={form.heartRate} onChange={set('heartRate')} placeholder="–" style={{ ...input, width: 90 }} />
          </label>
          <label style={label}>Blood pressure
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input inputMode="numeric" value={form.bpSys} onChange={set('bpSys')} placeholder="sys" aria-label="Systolic" style={{ ...input, width: 70 }} />
              /
              <input inputMode="numeric" value={form.bpDia} onChange={set('bpDia')} placeholder="dia" aria-label="Diastolic" style={{ ...input, width: 70 }} />
            </span>
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button type="submit" disabled={busy} className="clv-pill-btn" style={{ minHeight: 44 }}>{busy ? 'Saving…' : 'Save visit'}</button>
          {status?.error && <span role="alert" style={{ fontSize: 13, color: 'var(--st-refused)' }}>{status.error}</span>}
          {status?.saved && <span role="status" style={{ fontSize: 13, color: 'var(--text-mid)' }}>Saved. Readings can't be edited; to correct one, enter the visit again.</span>}
        </div>
      </form>

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--rule)' }}>
        {isLeadClinician ? (
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={measurementsShared} onChange={e => setMeasurementsShared(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1 }} />
            <span>
              <strong>Parents can see weight</strong>
              <span style={{ display: 'block', color: 'var(--text-mid)', fontSize: 13, lineHeight: 1.5 }}>
                They see each visit's weight and date, nothing else: no vitals, no change figures. The teen never sees it.
              </span>
            </span>
          </label>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>The family's lead therapist decides whether the parents see weight.</p>
        )}
      </div>
    </SectionCard>
  )
}

const th = { textAlign: 'left', padding: '6px 8px', borderBottom: '1.5px solid var(--border-mid)', fontWeight: 700, color: 'var(--text-dark)' }
const td = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--rule)' }
const label = { display: 'grid', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }
const input = { minHeight: 40, padding: '0 8px', borderRadius: 'var(--radius)', border: '1.5px solid var(--border-mid)', fontSize: 15, background: 'white', boxSizing: 'border-box' }

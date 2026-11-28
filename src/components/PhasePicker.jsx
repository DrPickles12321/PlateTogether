import { useState } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { PHASES } from '../lib/childProfile'
import { phaseMove } from '../lib/programs'

// The family's treatment phase, in the clinician's family header (roadmap E1). Moving forward asks the lead
// therapist to confirm the new phase's short checklist; moving back says plainly that it is common. Every change
// is kept in the family's record, with what was ticked. Only the lead therapist changes it (firestore.rules).
const phaseName = p => (p == null ? 'Not set' : (PHASES[p] || `Phase ${p}`).split(':')[0])
const day = ms => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function PhasePicker({ phase }) {
  const { setChildPhase, isLeadClinician, phaseHistory = [] } = useFirebaseData()
  const [pending, setPending] = useState(null) // { to, move }
  const [ticked, setTicked] = useState([])
  const [busy, setBusy] = useState(false)
  const latest = phaseHistory[phaseHistory.length - 1]

  function choose(e) {
    const to = e.target.value === '' ? null : Number(e.target.value)
    const move = phaseMove(phase ?? null, to)
    if (move.direction === 'same') return
    if (move.direction === 'forward' && !move.checklist.length) { apply(to, []); return }
    if (move.direction === 'clear') { apply(null, []); return }
    setTicked([])
    setPending({ to, move })
  }

  async function apply(to, checked) {
    setBusy(true)
    await setChildPhase(to, { from: phase ?? null, checked }).catch(() => {})
    setBusy(false)
    setPending(null)
  }

  const toggle = id => setTicked(t => (t.includes(id) ? t.filter(x => x !== id) : [...t, id]))
  const allTicked = pending && pending.move.checklist.every(([id]) => ticked.includes(id))

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <label htmlFor="family-phase" style={{ fontSize: 14, color: 'var(--on-ink-soft)' }}>Treatment phase</label>
        {isLeadClinician ? (
          <select id="family-phase" value={pending ? String(pending.to ?? '') : String(phase || '')} onChange={choose} disabled={busy}
            style={{ minHeight: 40, padding: '6px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--on-ink-soft)', background: 'var(--ink)', color: 'var(--on-ink)', fontSize: 14, cursor: 'pointer' }}>
            <option value="">Not set</option>
            {Object.entries(PHASES).map(([n, text]) => <option key={n} value={n}>{text}</option>)}
          </select>
        ) : (
          <span id="family-phase" style={{ fontSize: 14, color: 'var(--on-ink)' }}>{phase ? PHASES[phase] : 'Not set'} <span style={{ color: 'var(--on-ink-soft)' }}>(the lead therapist sets this)</span></span>
        )}
      </div>

      {pending && (
        <div role="group" aria-label="Confirm the phase change" style={{ marginTop: 10, padding: '12px 14px', borderRadius: 'var(--radius)', background: 'rgba(250,249,246,0.1)', border: '1px solid var(--on-ink-soft)', maxWidth: 560 }}>
          {pending.move.direction === 'forward' ? (
            <>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Before moving to {phaseName(pending.to)}, confirm:</p>
              {pending.move.checklist.map(([id, text]) => (
                <label key={id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', fontSize: 14, cursor: 'pointer', lineHeight: 1.4 }}>
                  <input type="checkbox" checked={ticked.includes(id)} onChange={() => toggle(id)} style={{ width: 18, height: 18, marginTop: 1, flex: 'none' }} />
                  {text}
                </label>
              ))}
            </>
          ) : (
            <p style={{ fontSize: 15, lineHeight: 1.45 }}>Move back to {phaseName(pending.to)}? Moving back is common in treatment and isn't a failure.</p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" disabled={busy || (pending.move.direction === 'forward' && !allTicked)} onClick={() => apply(pending.to, ticked)}
              style={{ minHeight: 40, padding: '6px 14px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--on-ink)', color: 'var(--ink)', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: pending.move.direction === 'forward' && !allTicked ? 0.5 : 1 }}>
              {busy ? 'Saving…' : `Move to ${phaseName(pending.to)}`}
            </button>
            <button type="button" onClick={() => setPending(null)} style={{ minHeight: 40, padding: '6px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--on-ink-soft)', background: 'transparent', color: 'var(--on-ink)', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {latest && !pending && (
        <details style={{ marginTop: 6, fontSize: 13, color: 'var(--on-ink-soft)' }}>
          <summary style={{ cursor: 'pointer', minHeight: 32, display: 'flex', alignItems: 'center' }}>
            {latest.at ? `${phaseName(latest.to)} since ${day(latest.at)}, set by ${latest.byName}` : `${phaseName(latest.to)}, set by ${latest.byName}`} · phase history
          </summary>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
            {[...phaseHistory].reverse().map((c, i) => (
              <li key={i}>
                {c.at ? `${day(c.at)}: ` : ''}{phaseName(c.from)} → {phaseName(c.to)}
                {c.checked.length > 0 && ` (${c.checked.length} item${c.checked.length === 1 ? '' : 's'} confirmed)`}, by {c.byName}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

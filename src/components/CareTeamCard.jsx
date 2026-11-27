import { useState } from 'react'

// Lists clinicians linked to this family with revoke / restore controls.
// Revoking keeps the record (marked inactive) so the clinician can't silently
// re-link themselves — this is the parent's real kill switch on data access,
// and only the parent can turn it back on.
const row = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
  padding: '10px 0', borderBottom: '1px solid var(--rule)',
}

function btn(bg, color, border) {
  return {
    minHeight: 44, padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', background: bg, color, border: border ? `1.5px solid ${border}` : 'none',
  }
}

export default function CareTeamCard({ careTeam = [], onRevoke, onReEnable }) {
  const [confirmUid, setConfirmUid] = useState(null)
  const active = careTeam.filter(c => c.active !== false)
  const revoked = careTeam.filter(c => c.active === false)

  return (
    <section style={{ marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--rule)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 6 }}>Care team</h2>
      <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, margin: '0 0 8px' }}>
        Clinicians who can see your meal log. You can remove access at any time, and it takes effect straight away.
      </p>

      {active.length === 0 ? (
        <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: 0 }}>
          No one has access yet. Give your family code to your clinician to add them.
        </p>
      ) : active.map(c => (
        <div key={c.uid} style={row}>
          <span style={{ fontSize: 15, color: 'var(--text-dark)', overflowWrap: 'anywhere' }}>{c.clinicianEmail}</span>
          {confirmUid === c.uid ? (
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>Remove their access?</span>
              <button type="button" onClick={() => { onRevoke(c.uid); setConfirmUid(null) }} style={btn('var(--st-refused)', 'white')}>Yes, remove</button>
              <button type="button" onClick={() => setConfirmUid(null)} style={btn('white', 'var(--text-dark)', 'var(--border-mid)')}>Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmUid(c.uid)} style={btn('white', 'var(--st-refused)', 'var(--pink-mid)')}>Remove access</button>
          )}
        </div>
      ))}

      {revoked.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 4 }}>Removed</h3>
          {revoked.map(c => (
            <div key={c.uid} style={row}>
              <span style={{ fontSize: 15, color: 'var(--text-mid)', overflowWrap: 'anywhere' }}>{c.clinicianEmail}</span>
              <button type="button" onClick={() => onReEnable(c.uid)} style={btn('white', 'var(--ink)', 'var(--ink-mid)')}>Restore access</button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

import { useState } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { inviteLink } from '../lib/invites'

// The family's caregivers on the Account page (roadmap B6): who logs meals for this child, which home each
// lives in, and a one-use link to invite another. Everyone listed sees and logs the same record. Only the
// caregiver who set up the family removes others, so a disagreement can't lock that parent out by a tap.
const HOMES = [['main', 'Home 1'], ['second', 'Home 2']]
const shortDate = ms => new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function CaregiversCard() {
  const { caregivers, isFamilyCreator, openInvites, createInvite, cancelInvite, removeCaregiver, setHousehold } = useFirebaseData()
  const [fresh, setFresh] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(null)
  const [removing, setRemoving] = useState(null)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const waiting = openInvites.filter(i => i.code !== fresh)

  async function invite() {
    setBusy(true)
    setError('')
    try {
      const code = await createInvite()
      if (code) setFresh(code)
      else setError("Couldn't make an invite. Try again in a moment.")
    } catch {
      setError("Couldn't make an invite. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  async function copy(code) {
    try {
      await navigator.clipboard.writeText(inviteLink(code, origin))
      setCopied(code)
    } catch {
      setCopied(null)
    }
  }

  async function share(code) {
    try {
      await navigator.share({ title: 'Join our family on Plate Together', url: inviteLink(code, origin) })
    } catch { /* closed the share sheet */ }
  }

  return (
    <section aria-labelledby="caregivers" style={{ marginBottom: 24 }}>
      <h2 id="caregivers" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 6 }}>Caregivers</h2>
      <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, marginBottom: 10 }}>
        Everyone here logs meals and sees the same plan, notes and week.
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid var(--rule)', borderRadius: 'var(--radius)', background: 'white' }}>
        {caregivers.map((c, i) => (
          <li key={c.uid} style={{ padding: '10px 14px', borderTop: i ? '1px solid var(--rule)' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>
                {c.isYou ? 'You' : c.email || 'A caregiver'}
                {c.isCreator && <span style={{ fontWeight: 400, color: 'var(--text-light)' }}> · set up the family</span>}
              </span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-mid)' }}>
                Lives at
                <select value={c.household} onChange={e => setHousehold(c.uid, e.target.value)} style={{
                  minHeight: 40, padding: '0 8px', borderRadius: 'var(--radius)', border: '1.5px solid var(--border-mid)',
                  background: 'white', fontSize: 15, color: 'var(--text-dark)',
                }}>
                  {HOMES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </label>
            </div>
            {isFamilyCreator && !c.isYou && (
              removing === c.uid ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>They'll lose access to this family straight away.</span>
                  <button type="button" onClick={() => { removeCaregiver(c.uid); setRemoving(null) }} style={btn('var(--st-refused)', 'white')}>Remove</button>
                  <button type="button" onClick={() => setRemoving(null)} style={btn('white', 'var(--text-dark)', 'var(--border-mid)')}>Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setRemoving(c.uid)} style={{ ...linkBtn, marginTop: 4 }}>Remove from family</button>
              )
            )}
          </li>
        ))}
      </ul>

      {fresh ? (
        <div role="status" style={{ marginTop: 12, padding: '12px 14px', borderRadius: 'var(--radius)', background: 'var(--ink-light)' }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Send this link to the other caregiver</p>
          <p style={{ fontSize: 15, overflowWrap: 'anywhere', color: 'var(--ink)', marginBottom: 6 }}>{inviteLink(fresh, origin)}</p>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 10 }}>It works once, for 7 days. Anyone with the link can join, so send it only to them.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => copy(fresh)} style={btn('var(--ink)', 'white')}>{copied === fresh ? 'Copied' : 'Copy link'}</button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button type="button" onClick={() => share(fresh)} style={btn('white', 'var(--ink)', 'var(--ink-mid)')}>Share</button>
            )}
            <button type="button" onClick={() => setFresh(null)} style={btn('white', 'var(--text-dark)', 'var(--border-mid)')}>Done</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={invite} disabled={busy} style={{ ...btn('white', 'var(--ink)', 'var(--ink-mid)'), marginTop: 12 }}>
          {busy ? 'Making a link…' : 'Invite another caregiver'}
        </button>
      )}
      {error && <p role="alert" style={{ fontSize: 14, color: 'var(--st-refused)', marginTop: 8 }}>{error}</p>}

      {waiting.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 4 }}>Invites not used yet</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {waiting.map(i => (
              <li key={i.code} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '4px 0', fontSize: 14, color: 'var(--text-mid)' }}>
                <span>Link ending {i.code.slice(-4)}, until {shortDate(i.expiresAt)}</span>
                <button type="button" onClick={() => copy(i.code)} style={linkBtn}>{copied === i.code ? 'Copied' : 'Copy'}</button>
                <button type="button" onClick={() => cancelInvite(i.code)} style={linkBtn}>Cancel</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

const linkBtn = {
  minHeight: 44, padding: '0 4px', border: 'none', background: 'none', color: 'var(--ink)', fontSize: 14, fontWeight: 600,
  textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer',
}
function btn(bg, color, border) {
  return {
    minHeight: 44, padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', background: bg, color, border: border ? `1.5px solid ${border}` : 'none',
  }
}

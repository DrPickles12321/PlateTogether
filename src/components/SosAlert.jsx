import { useState } from 'react'
import Icon from './Icon'

function fmt(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function SosAlert({ sos, patientEmail, onAcknowledge }) {
  const open = sos.filter(s => s.status === 'open')
  const [replyFor, setReplyFor] = useState(null)
  const [reply, setReply] = useState('')
  if (open.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      {open.map(s => (
        <div key={s.id} style={{ background: 'var(--st-refused-bg)', border: '1.5px solid var(--pink-mid)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--st-refused)', marginBottom: 3 }}>Support requested</div>
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 10 }}>
            {patientEmail} · {fmt(s.createdAt)}{s.note ? ` — “${s.note}”` : ''}
          </div>
          {replyFor === s.id ? (
            <div>
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Note back to the parent (e.g. “Got your message — let's talk at our next check-in”)"
                style={{ width: '100%', border: '1.5px solid var(--pink-mid)', borderRadius: 'var(--radius)', padding: 8, fontSize: 13, fontFamily: "var(--font-ui)", resize: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => { setReplyFor(null); setReply('') }} style={{ padding: '7px 14px', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: "var(--font-ui)" }}>Cancel</button>
                <button onClick={() => { onAcknowledge(s.id, reply); setReplyFor(null); setReply('') }}
                  style={{ padding: '7px 14px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--st-refused)', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: "var(--font-ui)" }}>Acknowledge + send</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setReplyFor(s.id)} style={{ background: 'white', border: '1.5px solid var(--pink-mid)', color: 'var(--st-refused)', fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: "var(--font-ui)" }}><Icon name="tick" size={15} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 4 }} />Acknowledge</button>
          )}
        </div>
      ))}
    </div>
  )
}

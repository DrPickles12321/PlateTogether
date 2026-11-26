import { useState } from 'react'
import BottomSheet from './BottomSheet'
import WarningSignsCard from './WarningSignsCard'
import Icon from './Icon'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { HARD_MEAL } from '../lib/supportCopy'

// One place for help: message the care team (non-urgent) and the fixed when-to-call guidance.
// Reached from the Need help button on Today and from the hard-meal card.
export default function HelpSheet({ open, onClose, defaultNote = '' }) {
  const { sendSos } = useFirebaseData()
  const [note, setNote] = useState(defaultNote)
  const [sent, setSent] = useState(false)

  function handleClose() {
    setSent(false)
    setNote(defaultNote)
    onClose()
  }

  function handleSend() {
    sendSos({ note })
    setSent(true)
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Need help">
      <section aria-labelledby="help-message" style={{ marginBottom: 24 }}>
        <h3 id="help-message" style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{HARD_MEAL.messageAction}</h3>
        {sent ? (
          <p role="status" style={{
            fontSize: 15, lineHeight: 1.5, color: 'var(--text-dark)', background: 'var(--ink-light)',
            borderRadius: 'var(--radius)', padding: '12px 14px',
          }}>{HARD_MEAL.sent}</p>
        ) : (
          <>
            <label htmlFor="help-note" style={{ display: 'block', fontSize: 14, color: 'var(--text-mid)', marginBottom: 6 }}>
              What would you like them to know? (optional)
            </label>
            <textarea
              id="help-note" rows={3} value={note} onChange={e => setNote(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 16,
                border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', resize: 'vertical',
                fontFamily: 'var(--font-hand)', color: 'var(--ink)', lineHeight: 1.5,
              }}
            />
            <button
              onClick={handleSend}
              style={{
                marginTop: 10, width: '100%', minHeight: 48, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, borderRadius: 'var(--radius)', border: 'none',
                background: 'var(--ink)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            ><Icon name="message" size={18} />Send to care team</button>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 8 }}>{HARD_MEAL.notMonitored}</p>
          </>
        )}
      </section>
      <WarningSignsCard />
    </BottomSheet>
  )
}

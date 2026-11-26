import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useFirebaseData } from '../contexts/FirebaseDataContext'

// One-time, role-specific first-run intro. Dismissal is stored per-account in
// localStorage so it shows once and never nags. Purely a UX hint — no data written.
const STEPS = {
  parent: [
    { text: 'Log meals on the Today tab — add foods and mark how each meal went.' },
    { text: 'Share your family code with your clinician so they can follow along.' },
    { text: 'Check Insights any time for a gentle look at the week.' },
  ],
  clinician: [
    { text: 'Ask a family for their code (shown on their Account page).' },
    { text: 'Add them under “Add by family code” to view their week.' },
    { text: 'Review meals, distress, and rhythm before each session.' },
  ],
}

export default function WelcomeModal({ role }) {
  const { user } = useAuth()
  const { familyCode } = useFirebaseData()
  const key = user ? `pt_welcomed_v1_${user.uid}` : null
  const [open, setOpen] = useState(() => {
    if (!key) return false
    try { return !localStorage.getItem(key) } catch { return false }
  })

  if (!open || !role || !STEPS[role]) return null

  function dismiss() {
    try { if (key) localStorage.setItem(key, new Date().toISOString()) } catch { /* ignore */ }
    setOpen(false)
  }

  const steps = STEPS[role]

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(29,33,43,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ background: '#fff', borderRadius: 'var(--radius)', maxWidth: 420, width: '100%', padding: '28px 24px', boxShadow: '0 14px 44px rgba(0,0,0,0.25)' }}
      >
        <h3 className="font-hand" style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 600, color: 'var(--text-dark)' }}>
          Welcome to Plate Together
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '0 0 18px', lineHeight: 1.5 }}>
          {role === 'parent'
            ? 'A calm, private way to track meals and share them with your care team.'
            : 'A quick weekly view of how each family’s meals are going.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.5 }}>{s.text}</span>
            </div>
          ))}
        </div>

        {role === 'parent' && familyCode && (
          <div style={{ background: 'var(--surface-warm)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-light)', marginBottom: 4 }}>Your family code</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--coral)' }}>{familyCode}</div>
          </div>
        )}

        <button
          type="button"
          onClick={dismiss}
          style={{
            width: '100%', border: 'none', borderRadius: 13, padding: '13px 0',
            background: 'var(--ink)',
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(35,64,142,0.3)',
          }}
        >Get started</button>
      </div>
    </div>
  )
}

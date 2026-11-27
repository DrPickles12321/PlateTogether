import { useState } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import DeleteAccountModal from '../components/DeleteAccountModal'
import CareTeamCard from '../components/CareTeamCard'
import ChildProfileCard from '../components/ChildProfileCard'
import { signOutOfApp } from '../lib/signOut'

const section = { marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--rule)' }
const h3 = { fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 6 }

export default function AccountView() {
  const { deleteAccount, careTeam, revokeCareTeamAccess, reEnableCareTeamAccess, familyCode, childProfile, saveChildProfile } = useFirebaseData()
  const isMobile = useIsMobile()
  const [showDelete, setShowDelete] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  return (
    <div style={{ padding: isMobile ? '12px 16px 24px' : '24px 32px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
      <h1 className="font-hand" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.1 }}>Account</h1>
      <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: '4px 0 20px' }}>
        Who can see your meal log, and your account settings.
      </p>

      <ChildProfileCard profile={childProfile} onSave={saveChildProfile} />

      {familyCode && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={h3}>Family code</h2>
          <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, marginBottom: 10 }}>
            Give this code to your clinician so they can see your meal log.
          </p>
          <div style={{
            display: 'inline-block', padding: '10px 16px', borderRadius: 'var(--radius)',
            border: '1.5px dashed var(--ink-mid)', background: 'white',
            fontSize: 22, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)',
          }}>{familyCode}</div>
        </section>
      )}

      <CareTeamCard careTeam={careTeam} onRevoke={revokeCareTeamAccess} onReEnable={reEnableCareTeamAccess} />

      <section style={section}>
        <h2 style={h3}>Sign out</h2>
        {confirmSignOut ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 15, color: 'var(--text-mid)' }}>Sign out of Plate Together on this device?</span>
            <button type="button" onClick={signOutOfApp} style={btn('var(--ink)', 'white')}>Sign out</button>
            <button type="button" onClick={() => setConfirmSignOut(false)} style={btn('white', 'var(--text-dark)', 'var(--border-mid)')}>Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmSignOut(true)} style={btn('white', 'var(--text-dark)', 'var(--border-mid)')}>Sign out</button>
        )}
      </section>

      <section style={section}>
        <h2 style={{ ...h3, color: 'var(--st-refused)' }}>Delete account</h2>
        <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.55, margin: '0 0 12px' }}>
          Deleting your account permanently removes all of your data. This can't be undone.
        </p>
        <button type="button" onClick={() => setShowDelete(true)} style={btn('white', 'var(--st-refused)', 'var(--st-refused)')}>
          Delete account
        </button>
      </section>

      <DeleteAccountModal open={showDelete} onClose={() => setShowDelete(false)} onConfirm={deleteAccount} />
    </div>
  )
}

function btn(bg, color, border) {
  return {
    minHeight: 44, padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', background: bg, color, border: border ? `1.5px solid ${border}` : 'none',
  }
}

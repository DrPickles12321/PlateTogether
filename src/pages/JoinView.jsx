import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { fsdb } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { joinFamilyByInvite } from '../lib/accounts'
import { inviteState, isInviteCode } from '../lib/invites'

// Joining a family from an invite link (roadmap B6), for someone already signed in. A new account made from
// the link joins during sign-up (LoginScreen), and lands here already in the family.
const SAY = {
  ok: ['Join this family?', "Another caregiver invited you to share their child's meal log on Plate Together. You'll both log meals and see the same plan, notes and week."],
  joined: ["You're in this family", 'You already log meals with this family.'],
  yours: ["You're in this family", 'You joined with this invite.'],
  used: ['This invite has been used', 'Each link works once. Ask the caregiver who sent it for a new one.'],
  expired: ['This invite has expired', 'Links last 7 days. Ask the caregiver who sent it for a new one.'],
  missing: ["We couldn't find this invite", 'Check the link, or ask the caregiver who sent it for a new one.'],
}

export default function JoinView() {
  const { code = '' } = useParams()
  const { user } = useAuth()
  const { familyId } = useFirebaseData()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const valid = isInviteCode(code)
  const [loaded, setLoaded] = useState({ code: null, invite: null })
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!valid) return undefined
    let live = true
    getDoc(doc(fsdb, `invites/${code}`))
      .then(s => { if (live) setLoaded({ code, invite: s.exists() ? s.data() : null }) })
      .catch(() => { if (live) setLoaded({ code, invite: null }) })
    return () => { live = false }
  }, [code, valid])

  const loading = valid && loaded.code !== code
  const state = valid ? inviteState(loaded.invite, { uid: user?.uid, families: familyId ? { [familyId]: 'caregiver' } : {} }) : 'missing'
  const [title, body] = SAY[state]

  async function join() {
    setJoining(true)
    setError('')
    try {
      await joinFamilyByInvite({ uid: user.uid, email: user.email, code })
      navigate('/parent/next', { replace: true })
    } catch {
      setError("That didn't work. The invite may have just been used or expired; ask for a new one.")
      setJoining(false)
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', padding: isMobile ? '20px 20px 0' : '32px 20px 0' }}>
      {loading ? <p style={{ fontSize: 16, color: 'var(--text-mid)' }}>Checking the invite…</p> : (
        <>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{title}</h1>
          <p style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--text-mid)', marginTop: 8 }}>{body}</p>
          {state === 'ok' && familyId && (
            <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-mid)', marginTop: 8 }}>
              Your account already has a meal log of its own. After joining, you'll see this family's instead.
            </p>
          )}
          {state === 'ok' ? (
            <button type="button" onClick={join} disabled={joining} style={{ ...primary, marginTop: 20 }}>
              {joining ? 'Joining…' : 'Join the family'}
            </button>
          ) : (
            <Link to="/parent/next" style={{ ...primary, marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              Go to Next meal
            </Link>
          )}
          {error && <p role="alert" style={{ fontSize: 15, color: 'var(--st-refused)', marginTop: 10 }}>{error}</p>}
        </>
      )}
    </div>
  )
}

const primary = {
  width: '100%', minHeight: 52, border: 'none', borderRadius: 'var(--radius)', background: 'var(--ink)',
  color: 'var(--on-ink)', fontSize: 17, fontWeight: 600, cursor: 'pointer',
}

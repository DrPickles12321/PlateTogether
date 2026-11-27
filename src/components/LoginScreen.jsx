import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { ref, set } from 'firebase/database'
import { auth, db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useIsMobile } from '../hooks/useIsMobile'

const INPUT_STYLE = {
  width: '100%', minHeight: 48, padding: '10px 14px', borderRadius: 'var(--radius)',
  border: '1.5px solid var(--border-mid)', background: 'white', fontSize: 16, color: 'var(--text-dark)',
  boxSizing: 'border-box',
}

export default function LoginScreen() {
  const { loginError, clearLoginError, setPendingRole } = useAuth()
  const isMobile = useIsMobile()
  const [mode, setMode]         = useState('signin')
  const [role, setRole]         = useState(null)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [consented, setConsented] = useState(false)

  const displayError = loginError || error
  const CONSENT_VERSION = 1

  async function handleSubmit(e) {
    e.preventDefault()
    if (mode === 'register' && !role) { setError('Choose Parent or Clinician first.'); return }
    if (mode === 'register' && !consented) { setError('Please agree to the terms to create an account.'); return }
    clearLoginError()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        // The stored role decides where an existing account lands, so sign-in does not ask for it.
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        // Remember the chosen role so AuthContext can use it immediately — the
        // role write below may not land before onAuthStateChanged reads it.
        setPendingRole(role)
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        const { uid } = cred.user
        const writes = {
          [`users/${uid}/role`]:  role,
          [`users/${uid}/email`]: email,
          [`users/${uid}/nutritionalTargets`]: { protein: 75, carbs: 150, fruitsVeggies: 200 },
          [`users/${uid}/consent`]: { agreedAt: new Date().toISOString(), version: CONSENT_VERSION },
        }
        if (role === 'parent') {
          const code = generateFamilyCode()
          writes[`users/${uid}/familyCode`]  = code
          writes[`familyCodes/${code}`]      = uid
        }
        await Promise.all(Object.entries(writes).map(([path, val]) => set(ref(db, path), val)))
      }
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  const labelStyle = { fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: 6 }

  const heading = (
    <div style={{ marginBottom: 22 }}>
      <h2 className="font-hand" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.15, marginBottom: 6 }}>
        {mode === 'signin' ? 'Welcome back' : 'Create an account'}
      </h2>
      <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5 }}>
        {mode === 'signin' ? "Sign in to your family's account." : 'Set up your account to get started.'}
      </p>
    </div>
  )

  const formBlock = (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {mode === 'register' && (
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={labelStyle}>I am a</legend>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['parent', 'Parent or carer'], ['clinician', 'Clinician']].map(([r, text]) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={role === r}
                  onClick={() => { setRole(r); clearLoginError(); setError('') }}
                  style={{
                    flex: 1, minHeight: 48, borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 15, fontWeight: 700,
                    border: `1.5px solid ${role === r ? 'var(--ink)' : 'var(--border-mid)'}`,
                    background: role === r ? 'var(--ink)' : 'white', color: role === r ? 'white' : 'var(--text-dark)',
                  }}
                >{text}</button>
              ))}
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor="login-email" style={labelStyle}>Email</label>
          <input id="login-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required style={INPUT_STYLE} />
        </div>

        <div>
          <label htmlFor="login-password" style={labelStyle}>Password</label>
          <input
            id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} style={INPUT_STYLE}
          />
          {mode === 'register' && <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 6 }}>At least 6 characters.</p>}
        </div>

        {mode === 'register' && (
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
            <input
              type="checkbox"
              checked={consented}
              onChange={e => { setConsented(e.target.checked); setError('') }}
              style={{ marginTop: 3, width: 20, height: 20, flexShrink: 0, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.55 }}>
              I agree to Plate Together storing meal and wellbeing information to support recovery.
              {role === 'parent'
                ? ' If this account is for a child, I confirm I am their parent or guardian and consent on their behalf.'
                : ' I will only access a family’s data with their consent (via their family code).'}
              {' '}This app is a support tool, <strong>not a medical device or emergency service</strong>. In a crisis, call 988 or 911.
            </span>
          </label>
        )}

        {displayError && (
          <div role="alert" style={{
            background: 'var(--st-refused-bg)', border: '1px solid var(--pink-mid)', borderRadius: 'var(--radius)',
            padding: '12px 14px', fontSize: 15, color: 'var(--st-refused)', lineHeight: 1.5, fontWeight: 600,
          }}>
            {displayError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (mode === 'register' && !consented)}
          style={{
            width: '100%', minHeight: 50, borderRadius: 'var(--radius)', border: 'none', marginTop: 4,
            background: 'var(--ink)', color: 'white', fontSize: 16, fontWeight: 700,
            cursor: loading || (mode === 'register' && !consented) ? 'not-allowed' : 'pointer',
            opacity: loading || (mode === 'register' && !consented) ? 0.55 : 1,
          }}
        >
          {loading
            ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
            : (mode === 'signin' ? 'Sign in' : 'Create account')}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 15, color: 'var(--text-mid)', marginTop: 18 }}>
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setError(''); clearLoginError() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', fontWeight: 700, fontSize: 15, padding: '10px 4px', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          {mode === 'signin' ? 'Create one' : 'Sign in'}
        </button>
      </p>
    </>
  )

  // The cover label of a composition notebook: the name written in, ruled line under it.
  const coverLabel = (
    <div style={{
      background: 'white', borderRadius: 'var(--radius)', padding: '18px 22px 14px', maxWidth: 360,
      boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
    }}>
      <h1 className="font-hand" style={{ fontSize: isMobile ? 34 : 44, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.05 }}>Plate Together</h1>
      <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--rule)' }}>
        Meal support for families in eating disorder recovery, shared with their care team.
      </p>
    </div>
  )

  if (isMobile) {
    return (
      <div style={{ minHeight: '100svh', background: 'var(--desk)', boxSizing: 'border-box', padding: '24px 16px calc(24px + env(safe-area-inset-bottom))' }}>
        <div style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
          <div style={{ background: 'var(--ink)', borderRadius: 'var(--radius)', padding: 18, marginBottom: 18 }}>{coverLabel}</div>
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '22px 18px', border: '1px solid var(--rule-strong)' }}>
            {heading}
            {formBlock}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex' }}>
      <div style={{ flex: '0 0 42%', background: 'var(--ink)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '72px 56px' }}>
        {coverLabel}
        <ul style={{ margin: '32px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 12, maxWidth: 360 }}>
          {['Write down each meal in seconds', 'Get help after a hard meal', 'Share the week with your care team'].map(text => (
            <li key={text} style={{ fontSize: 16, color: 'rgba(255,255,255,0.92)', lineHeight: 1.45 }}>{text}</li>
          ))}
        </ul>
      </div>
      <div style={{ flex: 1, background: 'var(--desk)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
        <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 'var(--radius)', padding: '32px 28px', border: '1px solid var(--rule-strong)' }}>
          {heading}
          {formBlock}
        </div>
      </div>
    </div>
  )
}

function generateFamilyCode() {
  // Cryptographically secure, fixed 8-char code from an unambiguous alphabet
  // (no 0/O/1/I/L). 32^8 ≈ 1.1 trillion combinations to resist guessing.
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':           return 'That email address is not valid.'
    case 'auth/user-not-found':          return 'No account found with that email.'
    case 'auth/wrong-password':          return 'Incorrect password. Please try again.'
    case 'auth/invalid-credential':      return 'Email or password is incorrect.'
    case 'auth/email-already-in-use':    return 'An account with that email already exists.'
    case 'auth/weak-password':           return 'Password must be at least 6 characters.'
    case 'auth/too-many-requests':       return 'Too many attempts. Please wait a moment.'
    case 'auth/network-request-failed':  return 'Network error. Check your connection.'
    default:                             return 'Something went wrong. Please try again.'
  }
}

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { pushSupport, enablePush, disablePush, pushOnHere } from '../lib/pushNotifications'
import { TAG_IN } from '../lib/supportCopy'

// Turning tag-in notifications on for this phone (roadmap C3). Hidden until the Web Push key is configured.
export default function PushToggle() {
  const { user } = useAuth()
  const [support, setSupport] = useState(pushSupport)
  const [on, setOn] = useState(pushOnHere)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  if (support === 'off') return null

  async function turnOn() {
    setBusy(true)
    setFailed(false)
    const result = await enablePush(user.uid)
    setBusy(false)
    if (result === 'on') setOn(true)
    else if (result === 'blocked') setSupport('blocked')
    else setFailed(true)
  }
  async function turnOff() {
    setBusy(true)
    await disablePush(user.uid)
    setBusy(false)
    setOn(false)
  }

  return (
    <section aria-labelledby="push" style={{ marginBottom: 24 }}>
      <h2 id="push" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 6 }}>{TAG_IN.pushTitle}</h2>
      <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, marginBottom: 10 }}>{TAG_IN.pushWhy}</p>
      {support === 'install' && <p style={note}>{TAG_IN.pushInstall}</p>}
      {support === 'blocked' && <p style={note}>{TAG_IN.pushBlocked}</p>}
      {support === 'ready' && (on ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15 }}>{TAG_IN.pushOn}</span>
          <button type="button" onClick={turnOff} disabled={busy} style={btn}>{TAG_IN.pushTurnOff}</button>
        </div>
      ) : (
        <button type="button" onClick={turnOn} disabled={busy} style={btn}>{TAG_IN.pushTurnOn}</button>
      ))}
      {failed && <p role="alert" style={{ ...note, color: 'var(--st-refused)', marginTop: 8 }}>{TAG_IN.pushFailed}</p>}
    </section>
  )
}

const note = { fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5 }
const btn = {
  minHeight: 44, padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  background: 'white', color: 'var(--ink)', border: '1.5px solid var(--ink-mid)',
}

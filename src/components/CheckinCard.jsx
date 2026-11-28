import { useState } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { STRAIN, SUPPORT, isoWeek, needsSupportNow } from '../lib/checkins'
import { CHECKIN } from '../lib/supportCopy'
import HelpSheet from './HelpSheet'

// Once a week on Next meal (roadmap F2): two one-tap questions about how the parent is coping. Skippable for
// the week on this device. Hard answers get a gentle offer to message the care team, nothing more.
const SKIP_KEY = 'pt_checkin_skipped'

export default function CheckinCard() {
  const { checkins = [], saveCheckin, familyId } = useFirebaseData()
  const week = isoWeek()
  const [strain, setStrain] = useState(null)
  const [done, setDone] = useState(null) // { strain, support }
  const [skipped, setSkipped] = useState(() => { try { return localStorage.getItem(SKIP_KEY) === week } catch { return false } })
  const [helpOpen, setHelpOpen] = useState(false)
  const answered = checkins.some(c => c.week === week)

  if (!familyId || skipped || (answered && !done)) return null

  async function answer(support) {
    const value = { strain, support }
    const ok = await saveCheckin(value)
    if (ok) setDone(value)
  }
  function skip() {
    try { localStorage.setItem(SKIP_KEY, week) } catch { /* storage blocked */ }
    setSkipped(true)
  }

  return (
    <section aria-labelledby="checkin" style={{ margin: '18px 20px 0', padding: '14px 16px', borderRadius: 'var(--radius)', background: 'white', border: '1px solid var(--rule)' }}>
      <h2 id="checkin" style={{ fontSize: 16, fontWeight: 700 }}>{CHECKIN.title}</h2>
      {done ? (
        <div role="status">
          <p style={{ fontSize: 15, lineHeight: 1.5, marginTop: 6 }}>{CHECKIN.thanks}</p>
          {needsSupportNow(done) && (
            <>
              <p style={{ fontSize: 15, lineHeight: 1.5, marginTop: 8 }}>{CHECKIN.heavy}</p>
              <button type="button" onClick={() => setHelpOpen(true)} style={{ ...chip(true), marginTop: 10 }}>{CHECKIN.message}</button>
            </>
          )}
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{CHECKIN.why}</p>
          <p id="checkin-q" style={{ fontSize: 15, fontWeight: 600, margin: '12px 0 8px' }}>{strain == null ? CHECKIN.strain : CHECKIN.support}</p>
          <div role="group" aria-labelledby="checkin-q" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(strain == null ? STRAIN : SUPPORT).map(([value, word]) => (
              <button key={value} type="button" onClick={() => (strain == null ? setStrain(value) : answer(value))} style={chip(false)}>{word}</button>
            ))}
          </div>
          <button type="button" onClick={skip} style={{ minHeight: 44, marginTop: 6, padding: 0, border: 'none', background: 'none', color: 'var(--text-mid)', fontSize: 14, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>{CHECKIN.notNow}</button>
        </>
      )}
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} defaultNote={CHECKIN.note} />
    </section>
  )
}

function chip(primary) {
  return {
    minHeight: 44, padding: '8px 14px', borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
    border: primary ? 'none' : '1.5px solid var(--ink-mid)', background: primary ? 'var(--ink)' : 'white', color: primary ? 'var(--on-ink)' : 'var(--ink)',
  }
}

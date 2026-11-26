import { useState, useRef, useEffect, useMemo } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { buildWeekFacts } from '../lib/weekFacts'
import { sendChat } from '../lib/chatService'
import Icon from './Icon'

const GREETING = { role: 'assistant', content: 'Hi! I can recap how this week went or answer questions about your logs. Want a recap?' }

export default function ChatWidget() {
  // ChatWidget renders as a sibling of <Outlet> (not inside it), so it reads
  // data straight from the context provider, not useOutletContext.
  const { mealStatuses = {}, allMealItems = {}, mealDistress = {}, sendSos, mySos = [] } = useFirebaseData()
  const isMobile = useIsMobile()
  // On mobile, clear the ~62px bottom tab bar; on desktop there's no tab bar.
  const bubbleBottom = 'calc(18px + env(safe-area-inset-bottom))'
  const panelBottom = `calc(${isMobile ? 70 : 72}px + env(safe-area-inset-bottom))`
  const panelHeight = `min(520px, calc(100dvh - ${isMobile ? 200 : 130}px))`
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSos, setShowSos] = useState(false)
  const [sosNote, setSosNote] = useState('')
  const [sosSent, setSosSent] = useState(false)
  const scrollRef = useRef(null)

  const weekFacts = useMemo(() => buildWeekFacts({ mealStatuses, allMealItems, mealDistress }), [mealStatuses, allMealItems, mealDistress])

  // Unread dot when a care-team response arrived and the panel is closed.
  const latestResponseAt = useMemo(() => {
    const withResp = mySos.filter(s => s.response?.at).map(s => s.response.at).sort()
    return withResp[withResp.length - 1] || null
  }, [mySos])
  const [seenResponseAt, setSeenResponseAt] = useState(null)
  const hasUnread = latestResponseAt && latestResponseAt !== seenResponseAt && !open

  useEffect(() => { if (open && latestResponseAt) setSeenResponseAt(latestResponseAt) }, [open, latestResponseAt])
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight) }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const reply = await sendChat(next.filter(m => m !== GREETING).slice(-12), weekFacts)
      setMessages(m => [...m, { role: 'assistant', content: reply || "Sorry, I didn't catch that." }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "I couldn't reach the assistant just now — try again in a moment." }])
    } finally {
      setBusy(false)
    }
  }

  function confirmSos() {
    sendSos({ note: sosNote })
    setSosSent(true)
    setSosNote('')
    setMessages(m => [...m, { role: 'assistant', content: "I've let your care team know. They will see it next time they open Plate Together. This is not an emergency line." }])
    
  }

  const careResponses = mySos.filter(s => s.response?.body)

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        aria-expanded={open}
        style={{
          // On phones the button sits in the empty right of the top bar, so it never covers a meal's Log button.
          position: 'fixed', right: isMobile ? 12 : 14, ...(isMobile ? { top: 4 } : { bottom: bubbleBottom }), zIndex: 45,
          display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '8px 14px',
          borderRadius: 22, border: '1.5px solid var(--ink)', cursor: 'pointer',
          background: open ? 'var(--ink)' : 'white', color: open ? 'white' : 'var(--ink)',
          fontSize: 15, fontWeight: 700, boxShadow: isMobile ? 'none' : '0 4px 14px rgba(29,33,43,0.14)',
        }}
      >
        <Icon name={open ? 'close' : 'message'} size={18} />{open ? 'Close' : 'Ask'}
        {hasUnread && <span style={{ position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderRadius: '50%', background: 'var(--st-refused)', border: '2px solid white' }} />}
      </button>

      {open && (
        <div role="dialog" aria-label="Assistant" style={{
          position: 'fixed', right: 14, bottom: panelBottom, zIndex: 45,
          width: 'min(380px, calc(100vw - 28px))', height: panelHeight,
          background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--rule-strong)',
          boxShadow: '0 12px 40px rgba(29,33,43,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: "var(--font-ui)",
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
            <div className="font-hand" style={{ fontWeight: 600, fontSize: 18, color: 'var(--text-dark)' }}>Ask about your week</div>
            <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>Answers come from what you logged. Not medical advice.</div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {careResponses.map(s => (
              <div key={s.id} style={{ background: 'var(--ink-light)', border: '1px solid var(--ink-mid)', borderRadius: 'var(--radius)', padding: '10px 12px', fontSize: 15, color: 'var(--text-dark)' }}>
                <strong>Your care team:</strong> {s.response.body}
              </div>
            ))}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '86%', padding: '10px 12px', borderRadius: 'var(--radius)', fontSize: 15, lineHeight: 1.5,
                background: m.role === 'user' ? 'var(--coral-light)' : 'var(--surface-warm)',
                color: 'var(--text-dark)',
              }}>{m.content}</div>
            ))}
            {busy && <div style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--text-light)' }}>typing…</div>}
          </div>

          {showSos ? (
            <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
              {sosSent ? (
                <p role="status" style={{ fontSize: 15, color: 'var(--text-dark)', lineHeight: 1.5 }}>Sent. Your care team will see it next time they open Plate Together. This is not an emergency line. <button onClick={() => { setShowSos(false); setSosSent(false) }} style={{ border: 'none', background: 'none', color: 'var(--ink)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', minHeight: 44 }}>Back to chat</button></p>
              ) : (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 6 }}>Let your care team know?</p>
                  <div style={{ background: 'var(--st-refused-bg)', border: '1px solid var(--pink-mid)', color: 'var(--st-refused)', fontSize: 14, borderRadius: 'var(--radius)', padding: '8px 10px', marginBottom: 8 }}>
                    Not for emergencies. If you're in crisis, call 988 or 911.
                  </div>
                  <textarea value={sosNote} onChange={e => setSosNote(e.target.value)} placeholder="Add a note (optional)…" rows={2}
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: 8, fontSize: 13, fontFamily: "var(--font-ui)", resize: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowSos(false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: 'var(--text-mid)', fontWeight: 600, cursor: 'pointer', fontFamily: "var(--font-ui)" }}>Cancel</button>
                    <button onClick={confirmSos} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: 'var(--ink)', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: "var(--font-ui)" }}>Send</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setShowSos(true)} aria-label="Message your care team"
                style={{ flexShrink: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius)', border: '1.5px solid var(--ink-mid)', background: 'white', color: 'var(--ink)', cursor: 'pointer' }}><Icon name="help" size={20} /></button>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about your week…" aria-label="Message to the assistant"
                style={{ flex: 1, minHeight: 44, border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', padding: '9px 12px', fontSize: 16, fontFamily: "var(--font-ui)", background: 'var(--surface-warm)' }} />
              <button onClick={send} disabled={busy} aria-label="Send"
                style={{ flexShrink: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius)', border: 'none', background: 'var(--ink)', color: 'white', cursor: 'pointer' }}><Icon name="right" size={20} /></button>
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-mid)', textAlign: 'center', padding: '0 10px 10px' }}>
            Not medical advice. In a crisis, call 988 or 911.
          </p>
        </div>
      )}
    </>
  )
}

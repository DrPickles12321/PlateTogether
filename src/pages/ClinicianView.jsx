import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { Outlet } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import WelcomeModal from '../components/WelcomeModal'
import DailyNutritionSummary from '../components/nutrition/DailyNutritionSummary'
import ClinicianTabBar from '../components/ClinicianTabBar'
import FamilyList from '../components/FamilyList'
import { familySummary, sortFamilies } from '../lib/familyTriage'
import { familyName, profileDetails, PHASES } from '../lib/childProfile'
import { getWeekIsoDates } from '../lib/insights'
import { localIsoDate } from '../lib/constants'
import { useIsMobile } from '../hooks/useIsMobile'

// ─── Shared helpers, used across the clinician sub-pages ───────────────────

export function useReveal(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('clv-visible'); obs.disconnect() } },
      { threshold: 0.06 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
}

export function RevealSection({ children, eyebrow, delay = 0, style = {} }) {
  const ref = useRef(null)
  useReveal(ref)
  return (
    <section
      ref={ref}
      className={`clv-reveal${delay ? ` d${delay}` : ''}`}
      style={{ marginTop: 24, ...style }}
    >
      {eyebrow && <h2 className="clv-section-title">{eyebrow}</h2>}
      {children}
    </section>
  )
}

export function SectionCard({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--rule)',
      padding: '18px 20px',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function ParentNotesPanel({ notes = [], onMarkRead, hiddenNoteIds = [], onHideNote, onUnhideNote }) {
  const [showHidden, setShowHidden] = useState(false)
  const [confirmHideDate, setConfirmHideDate] = useState(null)
  // Keyed by date (not id) — parentNotes are stored one-per-date in Firebase,
  // and older/manually-seeded notes aren't guaranteed to have an id.
  const sorted = [...notes].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .filter(n => !hiddenNoteIds.includes(n.date))
  const removedNotes = notes.filter(n => hiddenNoteIds.includes(n.date))
  const unreadCount = sorted.filter(n => !n.read_at).length

  return (
    <div>
      {unreadCount > 0 && (
        <span style={{
          display: 'inline-block', marginBottom: 12,
          fontSize: 12, fontWeight: 700,
         color: 'var(--peach)',
          background: 'var(--peach-light)', borderRadius: 999,
          padding: '3px 10px', border: '1px solid var(--peach-mid)',
        }}>
          {unreadCount} unread
        </span>
      )}

      {sorted.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic' }}>
          No notes from the parent yet.
        </p>
      ) : (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {sorted.map(note => {
            const isUnread = !note.read_at
            return (
              <div key={note.date} className="clv-timeline-item">
                <div className="clv-timeline-date">
                  {new Date(note.date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                </div>
                <div>
                  {isUnread && (
                    <span style={{
                      display: 'inline-block', fontSize: 12, fontWeight: 700,
                      color: 'var(--peach)', marginBottom: 4,
                    }}>New</span>
                  )}
                  <p style={{
                    fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.6,
                    fontWeight: isUnread ? 500 : 400,
                  }}>
                    {note.body}
                  </p>
                </div>
                <div style={{ paddingTop: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  {isUnread ? (
                    <button
                      onClick={() => onMarkRead?.(note.id)}
                      className="clv-pill-btn"
                      style={{ fontSize: 13, padding: '4px 12px' }}
                    >
                      Mark read
                    </button>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--mint)', fontWeight: 600 }}>
                      Read
                    </span>
                  )}
                  {onHideNote && (
                    confirmHideDate === note.date ? (
                      <span style={{ fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                        Hide?{' '}
                        <button
                          onClick={() => { onHideNote(note.date); setConfirmHideDate(null) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--coral)', fontWeight: 700, fontSize: 14, padding: '0 6px', minHeight: 44, fontFamily: 'inherit' }}
                        >Yes</button>
                        {' / '}
                        <button
                          onClick={() => setConfirmHideDate(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 14, padding: '0 6px', minHeight: 44, fontFamily: 'inherit' }}
                        >Cancel</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmHideDate(note.date)}
                        title="Hide from my view"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 14, padding: '0 6px', minHeight: 44, fontFamily: 'inherit' }}
                      >Hide</button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {onUnhideNote && removedNotes.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: sorted.length ? 0 : 12 }}>
          <button
            onClick={() => setShowHidden(s => !s)}
            style={{
              width: '100%', padding: '7px 0', background: 'none', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', fontFamily: "'Lato', sans-serif",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-light)' }}>Hidden ({removedNotes.length})</span>
            <Icon name={showHidden ? 'up' : 'down'} size={16} style={{ color: 'var(--text-mid)' }} />
          </button>
          {showHidden && (
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {removedNotes.map(note => (
                <div key={note.date} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '8px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-light)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.body}
                  </p>
                  <button
                    onClick={() => onUnhideNote(note.date)}
                    style={{
                      flexShrink: 0, background: 'none', border: '1px solid var(--border-mid)',
                      borderRadius: 'var(--radius)', padding: '6px 12px', minHeight: 44, fontSize: 14, fontWeight: 600,
                      color: 'var(--mint)', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                    }}
                  >Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const DIGEST_ACCENT = {
  pattern:     'var(--border-mid)',
  improvement: 'var(--mint)',
  watch:       'var(--coral)',
}
const DIGEST_TYPE_LABEL = {
  pattern:     'Pattern',
  improvement: 'Progress',
  watch:       'Watch',
}

export function ClinicianDigestSection({ allMealItems, mealStatuses, mealTimesByDate = {}, parentNotes, generateClinicianDigest, getWeekIsoDates, detectWeeklyAnomalies }) {
  const [digest, setDigest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function load() {
    const weekDates = new Set(getWeekIsoDates(0))
    const thisWeekItems = Object.fromEntries(
      Object.entries(allMealItems).filter(([date]) => weekDates.has(date))
    )
    const thisWeekStatuses = Object.fromEntries(
      Object.entries(mealStatuses).filter(([date]) => weekDates.has(date))
    )
    const thisWeekNotes = parentNotes.filter(n => weekDates.has(n.date))
    const anomalies = detectWeeklyAnomalies({ allMealItems, mealStatuses, mealTimesByDate })

    setLoading(true)
    setError(null)
    generateClinicianDigest({
      mealItemsByDate: thisWeekItems,
      mealStatusesByDate: thisWeekStatuses,
      parentNotes: thisWeekNotes,
      anomalies,
    })
      .then(result => { setDigest(result || []); setLoading(false) })
      .catch(err => { console.error('Clinician digest error:', err); setError(true); setLoading(false) })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 2 }}>
            AI summary for a quick pre-session scan
          </p>
        </div>
        <button className={`clv-pill-btn${digest ? '' : ' filled'}`} onClick={load} disabled={loading}>
          {loading ? 'Generating…' : digest ? 'Regenerate' : 'Generate digest'}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: 'var(--coral)', marginTop: 4 }}>
          Could not generate digest. Try again in a moment.
        </p>
      )}

      {!loading && !error && digest === null && (
        <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic' }}>
          Click "Generate digest" to summarize this patient's week.
        </p>
      )}

      {digest && digest.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic' }}>
          No meals logged this week yet.
        </p>
      )}

      {digest && digest.length > 0 && (
        <div>
          {digest.map((item, i) => {
            const accent = DIGEST_ACCENT[item.type] || DIGEST_ACCENT.pattern
            const typeLabel = DIGEST_TYPE_LABEL[item.type] || item.type
            return (
              <div key={i} className="clv-digest-item">
                <div className="clv-digest-accent" style={{ background: accent }} />
                <div style={{ flex: 1 }}>
                  <span style={{
                    display: 'inline-block', fontSize: 12, fontWeight: 700,
                    color: accent === 'var(--border-mid)' ? 'var(--text-light)' : accent,
                    marginBottom: 4,
                  }}>
                    {typeLabel}
                  </span>
                  <p style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.65 }}>{item.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ClinicianSupplementEditor({ prescribedSupplements, onSave }) {
  const [input, setInput] = useState('')
  const [saved, setSaved] = useState(false)

  function handleAdd() {
    const trimmed = input.trim()
    if (!trimmed || prescribedSupplements.includes(trimmed)) return
    onSave([...prescribedSupplements, trimmed])
    setInput('')
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function handleRemove(name) {
    onSave(prescribedSupplements.filter(s => s !== name))
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 16 }}>
        Supplements appear in the patient's daily checklist.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="e.g. Calcium + D3"
          style={{
            flex: 1, padding: '8px 14px', borderRadius: 999,
            border: '1.5px solid var(--border)', fontSize: 13,
            color: 'var(--text-dark)', fontFamily: 'inherit', outline: 'none',
            background: 'var(--surface)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--coral)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="clv-pill-btn filled"
        >
          {saved ? 'Added' : 'Add'}
        </button>
      </div>
      {prescribedSupplements.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic' }}>
          No supplements prescribed yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {prescribedSupplements.map(name => (
            <span key={name} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--coral-light)', borderRadius: 999,
              padding: '5px 14px', fontSize: 13, color: 'var(--coral)',
              fontWeight: 500, border: '1px solid var(--coral-mid)',
            }}>
              {name}
              <button
                onClick={() => handleRemove(name)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--coral)', fontSize: 15, lineHeight: 1,
                  padding: 0, display: 'flex', alignItems: 'center', opacity: 0.6,
                }}
              ><Icon name="close" size={18} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Layout: header, patient selector, gating, tab nav + <Outlet> ──────────

export default function ClinicianView() {
  const {
    patients,
    viewingPatientUid,
    setViewingPatientUid,
    patientAccessDenied,
    retryPatientAccess,
    addPatientByCode,
    removePatient,
    patientsWithOpenSos,
    patientWeekData,
    setChildPhase,
    allMealItems: parentMealItems,
  } = useFirebaseData()

  const [addCodeInput, setAddCodeInput] = useState('')
  const [addCodeError, setAddCodeError]  = useState('')
  const [addCodeLoading, setAddCodeLoading] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const isMobile = useIsMobile()

  useEffect(() => { document.title = 'Families · Plate Together' }, [])

  // Every linked family with a plain-words summary of its week, most in need first.
  const families = useMemo(() => {
    const weekDates = getWeekIsoDates(0)
    const today = localIsoDate()
    return sortFamilies(patients.map(p => ({
      uid: p.uid,
      name: familyName(patientWeekData[p.uid]?.profile, p.email),
      details: profileDetails(patientWeekData[p.uid]?.profile, today),
      phase: patientWeekData[p.uid]?.profile?.phase || null,
      summary: familySummary({
        mealLogs: patientWeekData[p.uid]?.mealLogs,
        parentNotes: patientWeekData[p.uid]?.parentNotes,
        sosOpen: !!patientsWithOpenSos[p.uid],
        weekDates, today,
      }),
    })))
  }, [patients, patientWeekData, patientsWithOpenSos])
  const current = families.find(f => f.uid === viewingPatientUid) || null

  async function handleAddPatient(e) {
    e.preventDefault()
    setAddCodeError('')
    setAddCodeLoading(true)
    const result = await addPatientByCode(addCodeInput)
    setAddCodeLoading(false)
    if (result.error) { setAddCodeError(result.error) }
    else { setAddCodeInput('') }
  }

  function select(uid) {
    setViewingPatientUid(uid || null)
    setConfirmUnlink(false)
  }

  const showTabs = viewingPatientUid && !patientAccessDenied

  const addFamilyForm = (
    <form onSubmit={handleAddPatient} style={{ padding: isMobile ? 0 : '14px 16px' }}>
      <label htmlFor="clinician-add-code" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
        Add a family by code
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id="clinician-add-code"
          value={addCodeInput}
          onChange={e => { setAddCodeInput(e.target.value.toUpperCase()); setAddCodeError('') }}
          placeholder="Family code"
          maxLength={8}
          autoComplete="off"
          aria-describedby={addCodeError ? 'clinician-add-error' : undefined}
          style={{
            minHeight: 44, padding: '8px 12px', borderRadius: 'var(--radius)', border: '1.5px solid var(--border-mid)',
            fontSize: 16, color: 'var(--text-dark)', flex: 1, minWidth: 0,
            fontWeight: 600, letterSpacing: '0.08em', background: 'white',
          }}
        />
        <button type="submit" disabled={addCodeLoading || addCodeInput.length < 6} className="clv-pill-btn filled" style={{ minHeight: 44 }}>
          {addCodeLoading ? 'Adding…' : 'Add'}
        </button>
      </div>
      {addCodeError && (
        <p id="clinician-add-error" role="alert" style={{ fontSize: 14, color: 'var(--danger)', marginTop: 6 }}>{addCodeError}</p>
      )}
    </form>
  )

  // The open family's file: a forest band with who it is and why they're on the list, then the tabs.
  const file = !viewingPatientUid ? (
    <div style={{ padding: isMobile ? '8px 0' : '40px 32px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Choose a family</h1>
      <p style={{ fontSize: 15, color: 'var(--text-mid)', maxWidth: '56ch', marginTop: 6, lineHeight: 1.5 }}>
        {isMobile ? 'Pick a family above' : 'Pick a family from the list'} to open their file. Families most in need of you are listed first, with the reason.
        Families give you their code from the Account page of their app.
      </p>
    </div>
  ) : patientAccessDenied ? (
    <div style={{ margin: isMobile ? '8px 0' : 24, padding: '18px 20px', border: '1px solid var(--rule)', background: 'var(--highlight)' }}>
      <h1 style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Access removed</h1>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.55, margin: '0 0 12px' }}>
        {current?.name || 'This family'} has removed your access to their logs. If this was a mistake, ask them to grant you access again, then tap Try again.
      </p>
      <button type="button" onClick={() => retryPatientAccess?.()} className="clv-pill-btn">Try again</button>
    </div>
  ) : (
    <>
      <section aria-labelledby="family-title" style={{ background: 'var(--ink)', color: 'var(--on-ink)', padding: isMobile ? '16px 16px 18px' : '20px 28px 22px', margin: isMobile ? '0 -16px' : 0 }}>
        <p style={{ fontSize: 14, color: 'var(--on-ink-soft)' }}>Family file</p>
        <h1 id="family-title" style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--on-ink)', overflowWrap: 'anywhere' }}>{current?.name}</h1>
        {current?.details && <p style={{ fontSize: 15, color: 'var(--on-ink)', marginTop: 2 }}>{current.details}</p>}
        {current && (
          <p style={{ fontSize: 15, color: 'var(--on-ink-soft)', marginTop: 4 }}>
            {current.summary.reasons.length ? current.summary.reasons.join(' · ') : current.summary.reason}
          </p>
        )}
        {current && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label htmlFor="family-phase" style={{ fontSize: 14, color: 'var(--on-ink-soft)' }}>Treatment phase</label>
            <select id="family-phase" value={current.phase || ''} onChange={e => setChildPhase(Number(e.target.value) || null)}
              style={{ minHeight: 40, padding: '6px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--on-ink-soft)', background: 'var(--ink)', color: 'var(--on-ink)', fontSize: 14, cursor: 'pointer' }}>
              <option value="">Not set</option>
              {Object.entries(PHASES).map(([n, text]) => <option key={n} value={n}>{text}</option>)}
            </select>
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          {confirmUnlink ? (
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14 }}>Unlink this family?</span>
              <button type="button" onClick={() => { removePatient(viewingPatientUid); setConfirmUnlink(false) }}
                style={{ minHeight: 40, border: 'none', borderRadius: 'var(--radius)', padding: '6px 12px', background: 'var(--on-ink)', color: 'var(--danger)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >Yes, unlink</button>
              <button type="button" onClick={() => setConfirmUnlink(false)}
                style={{ minHeight: 40, border: '1px solid var(--on-ink-soft)', borderRadius: 'var(--radius)', padding: '6px 12px', background: 'transparent', color: 'var(--on-ink)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmUnlink(true)}
              style={{ minHeight: 40, border: 'none', background: 'none', padding: 0, color: 'var(--on-ink-soft)', fontSize: 14, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >Unlink family</button>
          )}
        </div>
      </section>
      <div style={{ padding: isMobile ? '0' : '0 28px 40px' }}>
        {!isMobile && <ClinicianTabBar variant="desktop" />}
        <Outlet context={{ setSelectedDay }} />
      </div>
    </>
  )

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', padding: isMobile ? '0 16px 96px' : 0 }}>
      {isMobile ? (
        <>
          <div style={{ padding: '14px 0', display: 'grid', gap: 12 }}>
            <div>
              <label htmlFor="clinician-patient" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Family</label>
              <select
                id="clinician-patient"
                value={viewingPatientUid || ''}
                onChange={e => select(e.target.value)}
                style={{
                  width: '100%', minHeight: 44, padding: '8px 36px 8px 12px', borderRadius: 'var(--radius)',
                  border: '1.5px solid var(--border-mid)', fontSize: 15, color: 'var(--text-dark)', background: 'white',
                  cursor: 'pointer', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23464D5B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                }}
              >
                <option value="">Choose a family</option>
                {families.map(f => (
                  <option key={f.uid} value={f.uid}>{f.name}{f.summary.priority ? ` (${f.summary.reason.toLowerCase()})` : ''}</option>
                ))}
              </select>
            </div>
            {!viewingPatientUid && addFamilyForm}
          </div>
          {file}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', minHeight: 'calc(100vh - 61px)', maxWidth: 1400, margin: '0 auto' }}>
          <aside aria-labelledby="families-title" style={{ background: 'white', borderRight: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '22px 16px 12px' }}>
              <h2 id="families-title" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>Families</h2>
              <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 2 }}>Who needs you most comes first.</p>
            </div>
            <FamilyList families={families} selectedUid={viewingPatientUid} onSelect={select} />
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--rule)' }}>{addFamilyForm}</div>
          </aside>
          <main style={{ minWidth: 0 }}>{file}</main>
        </div>
      )}

      {selectedDay && (
        <DailyNutritionSummary
          day={selectedDay.key}
          loggedMealItems={parentMealItems[selectedDay.date] || {}}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {isMobile && showTabs && <ClinicianTabBar variant="mobile" />}

      <WelcomeModal role="clinician" />
    </div>
  )
}

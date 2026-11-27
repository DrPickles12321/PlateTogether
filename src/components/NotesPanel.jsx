import { useState } from 'react'
import Icon from './Icon'
import NoteComposer from './NoteComposer'
import { localIsoDate } from '../lib/constants'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function toDateKey(isoString) {
  if (!isoString) return 'unknown'
  const d = new Date(isoString)
  return isNaN(d.getTime()) ? 'unknown' : localIsoDate(d)
}

export default function NotesPanel({ notes, mode, onSave, onDelete, notesReadByParent = {} }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const today = localIsoDate()

  const byDay = {}
  for (const note of notes) {
    const key = toDateKey(note.created_at)
    if (!byDay[key] || new Date(note.created_at) > new Date(byDay[key].created_at)) {
      byDay[key] = note
    }
  }

  const todayNote = byDay[today] || null

  return (
    <section style={{
      background: 'var(--surface-warm)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      fontFamily: "var(--font-ui)",
    }}>
      {/* Notebook tab header */}
      <div style={{
        background: 'var(--ink)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'white' }}>
            Clinician Notes
          </span>
        </div>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
          {formatDate(new Date().toISOString())}
        </span>
      </div>

      <div style={{
        display: 'flex',
        minHeight: 180,
      }}>
        <div style={{ flex: 1, padding: '16px 18px' }}>
          {mode === 'clinician' ? (
            <>
              <NoteComposer
                existingNote={todayNote}
                onSave={(body) => onSave({ body, existingNoteId: todayNote?.id || null })}
              />
              {todayNote && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  {notesReadByParent[todayNote.id]
                    ? <span style={{ fontSize: 13, color: 'var(--mint)', fontWeight: 500 }}><Icon name="tick" size={15} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 4 }} />Parent has read this note</span>
                    : <span style={{ fontSize: 13, color: 'var(--st-some)', fontWeight: 500 }}><Icon name="dot" size={14} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 4 }} />Parent hasn't read this yet</span>
                  }
                  {onDelete && (
                    confirmDelete ? (
                      <span style={{ fontSize: 13, color: 'var(--text-mid)', fontFamily: "var(--font-ui)" }}>
                        Delete this note?{' '}
                        <button
                          onClick={() => { onDelete(todayNote.id); setConfirmDelete(false) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--coral)', fontSize: 13, fontWeight: 700, padding: 0, fontFamily: 'inherit' }}
                        >Yes</button>
                        {' / '}
                        <button
                          onClick={() => setConfirmDelete(false)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 13, padding: 0, fontFamily: 'inherit' }}
                        >Cancel</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 13, padding: 0, fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}
                      >Delete note</button>
                    )
                  )}
                </div>
              )}
            </>
          ) : todayNote ? (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--coral)', fontSize: 16, lineHeight: 1.6, flexShrink: 0 }}><Icon name="dot" size={14} style={{ marginTop: 6 }} /></span>
                <p style={{
                  fontSize: 14, color: 'var(--text-dark)',
                  lineHeight: '28px', whiteSpace: 'pre-wrap', margin: 0,
                  fontFamily: "var(--font-ui)",
                }}>{todayNote.body}</p>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 10 }}>
                Last updated {formatDate(todayNote.created_at)}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingTop: 4 }}>
              <span style={{ color: 'rgba(35,64,142,0.3)', fontSize: 16, lineHeight: 1.6 }}><Icon name="dot" size={14} style={{ marginTop: 6 }} /></span>
              <p style={{ fontSize: 14, color: 'var(--text-light)', fontStyle: 'italic', margin: 0, lineHeight: '28px' }}>
                No note for today yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

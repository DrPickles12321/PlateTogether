import { useState, useEffect } from 'react'
import Icon from './Icon'

export default function NoteComposer({ onSave, existingNote }) {
  const [body, setBody] = useState(existingNote?.body || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saved' | 'error'

  useEffect(() => {
    if (existingNote?.body !== undefined) {
      setBody(existingNote.body)
    }
  }, [existingNote?.id])

  const isDirty = body.trim() !== (existingNote?.body?.trim() || '')

  async function handleSave() {
    if (body.trim().length < 1 || isSaving) return
    setIsSaving(true)
    setSaveStatus('idle')
    try {
      await onSave(body.trim())
      setSaveStatus('saved')
    } catch (err) {
      console.error('Failed to save note:', err)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        value={body}
        onChange={e => { setBody(e.target.value); setSaveStatus('idle') }}
        placeholder="Write a note for today..."
        rows={4}
        maxLength={1000}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          resize: 'none',
          fontSize: 14,
          color: 'var(--text-dark)',
          lineHeight: '28px',
          outline: 'none',
          fontFamily: "var(--font-ui)",
          padding: 0,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--text-light)' }}>{body.length} / 1000</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saveStatus === 'saved' && !isDirty && (
            <span style={{ fontSize: 13, color: 'var(--mint)', fontWeight: 500 }}><Icon name="tick" size={15} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 4 }} />Saved</span>
          )}
          {saveStatus === 'error' && (
            <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>Failed to save</span>
          )}
          <button
            onClick={handleSave}
            disabled={body.trim().length < 1 || isSaving || !isDirty}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              border: 'none',
              cursor: body.trim().length < 1 || isSaving || !isDirty ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-ui)",
              transition: 'all 0.15s',
              background: body.trim().length < 1 || isSaving || !isDirty
                ? 'rgba(35,64,142,0.15)'
                : 'var(--ink)',
              color: body.trim().length < 1 || isSaving || !isDirty
                ? 'var(--text-light)'
                : 'white',
            }}
          >
            {isSaving ? 'Saving…' : existingNote ? 'Update note' : 'Save note'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { linesFromText, MAX_LINES } from '../lib/carePlan'

// The clinician writes the family's meal plan here: a few lines to read at the table, and the
// steps for a refused meal. Parents see them on Next meal and right after marking a meal Refused.
// The app adds nothing of its own to these lines.
export default function FamilyPlanEditor({ plan, onSave }) {
  const [table, setTable] = useState(() => (plan?.tableReminders || []).join('\n'))
  const [refusal, setRefusal] = useState(() => (plan?.refusalSteps || []).join('\n'))
  const [status, setStatus] = useState('idle')

  async function save(e) {
    e.preventDefault()
    setStatus('saving')
    try {
      await onSave({ tableReminders: linesFromText(table), refusalSteps: linesFromText(refusal) })
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  const field = {
    boxSizing: 'border-box', width: '100%', padding: '10px 12px', border: '1.5px solid var(--border-mid)',
    borderRadius: 'var(--radius)', fontSize: 15, lineHeight: 1.5, resize: 'vertical', background: 'white',
  }
  const label = { display: 'block', fontSize: 15, fontWeight: 700, marginBottom: 4 }
  const hint = { fontSize: 13, color: 'var(--text-mid)', marginBottom: 6 }

  return (
    <form onSubmit={save} style={{ display: 'grid', gap: 16 }}>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5 }}>
        One line per item, up to {MAX_LINES} each. The family sees these on their Next meal screen and right after they mark a meal Refused.
      </p>
      <div>
        <label htmlFor="plan-table" style={label}>At the table</label>
        <p style={hint}>Short reminders the parent reads before a meal.</p>
        <textarea id="plan-table" rows={4} value={table} onChange={e => { setTable(e.target.value); setStatus('idle') }} style={field} />
      </div>
      <div>
        <label htmlFor="plan-refusal" style={label}>If a meal is refused</label>
        <p style={hint}>The steps you want the parent to follow, in order.</p>
        <textarea id="plan-refusal" rows={5} value={refusal} onChange={e => { setRefusal(e.target.value); setStatus('idle') }} style={field} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button type="submit" disabled={status === 'saving'} className="clv-pill-btn filled">
          {status === 'saving' ? 'Saving…' : 'Save plan for the family'}
        </button>
        <span role="status" style={{ fontSize: 14, color: status === 'error' ? 'var(--st-refused)' : 'var(--text-mid)' }}>
          {status === 'saved' ? 'Saved. The family sees it now.' : status === 'error' ? 'Could not save. Check your connection and try again.' : ''}
        </span>
      </div>
    </form>
  )
}

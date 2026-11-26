import { useState } from 'react'
import { lookupNutrition } from '../lib/nutritionService'

const FIELDS = [
  { key: 'calories',  label: 'Calories', unit: 'kcal' },
  { key: 'protein_g', label: 'Protein',  unit: 'g' },
  { key: 'carbs_g',   label: 'Carbs',    unit: 'g' },
  { key: 'fat_g',     label: 'Fat',      unit: 'g' },
  { key: 'fiber_g',   label: 'Fiber',    unit: 'g' },
]

const GROUP_LABEL = { grain: 'Grains', produce: 'Fruits & veggies', protein: 'Protein', dairy: 'Dairy', mixed: 'Mixed' }

// Shared nutrition facts view used inside a Modal on both desktop and mobile.
// Shows estimated values (from the local DB / USDA group) or the family's
// manually-entered override, with edit + reset.
export default function NutritionFacts({ food, onSave, onReset }) {
  const values = lookupNutrition(food)        // manual entry, else USDA, else no data
  const manual = food.nutrition || null      // hand-entered override
  const usda = food.usdaNutrition || null     // auto-fetched from USDA
  const source = values.source || 'none'
  const group = food.group || 'mixed'

  // With no data the fields start empty so nothing looks pre-filled with a guess.
  const startValues = () => Object.fromEntries(FIELDS.map(f => [f.key, values.hasData && (source !== 'manual' || manual?.[f.key] != null) ? String(values[f.key] ?? 0) : '']))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(startValues)
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setDraft(startValues())
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    const nutrition = {}
    for (const f of FIELDS) {
      const n = parseFloat(draft[f.key])
      // Only what the parent typed is saved; blanks stay blank instead of becoming 0.
      if (Number.isFinite(n) && n >= 0) nutrition[f.key] = Math.round(n * 10) / 10
    }
    try {
      await onSave(nutrition)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    setSaving(true)
    try {
      await onReset()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ fontFamily: "var(--font-ui)" }}>
      {/* Source + serving + group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{
          fontSize: 13, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
          background: source === 'manual' ? 'var(--mint-light)' : source === 'usda' ? 'var(--coral-light)' : 'var(--surface-warm)',
          color: source === 'manual' ? 'var(--mint)' : source === 'usda' ? 'var(--coral)' : 'var(--text-light)',
          border: `1px solid ${source === 'manual' ? 'var(--mint-mid)' : source === 'usda' ? 'var(--coral-mid)' : 'var(--border)'}`,
        }}>
          {source === 'manual' ? 'Manually entered' : source === 'usda' ? 'From USDA' : 'No data'}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
          marginLeft: 'auto', background: 'var(--peach-light)', color: 'var(--peach)',
          border: '1px solid var(--peach-mid)',
        }}>{GROUP_LABEL[group] || 'Mixed'}</span>
      </div>

      {!editing && (
        <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 14 }}>
          {source === 'none'
            ? 'We have no nutrition numbers for this food yet. Tap “Add values” to type them in from the package.'
            : source === 'usda' ? 'Per 100 g (USDA FoodData Central)' : 'Per serving, as you entered'}
        </p>
      )}

      {/* Values */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {FIELDS.map(f => (
          <div key={f.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 2px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>{f.label}</span>
            {editing ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={draft[f.key]}
                  onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                  style={{
                    width: 84, textAlign: 'right', padding: '7px 10px', borderRadius: 9,
                    border: '1.5px solid var(--border)', fontSize: 14, color: 'var(--text-dark)',
                    fontFamily: "var(--font-ui)", outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--coral)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <span style={{ fontSize: 12, color: 'var(--text-light)', width: 30 }}>{f.unit}</span>
              </span>
            ) : (
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-dark)' }}>
                {values.hasData && (source !== 'manual' || manual?.[f.key] != null) ? Math.round((values[f.key] ?? 0) * 10) / 10 : '—'}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-light)', marginLeft: 3 }}>{f.unit}</span>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
        {editing ? (
          <>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              style={btnStyle(false)}
            >Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || draft.calories.trim() === ''}
              style={{ ...btnStyle(true), opacity: draft.calories.trim() === '' ? 0.45 : 1 }}
            >{saving ? 'Saving…' : 'Save'}</button>
          </>
        ) : (
          <>
            {manual && (
              <button
                onClick={handleReset}
                disabled={saving}
                style={btnStyle(false)}
              >{usda ? 'Reset to USDA' : 'Clear my values'}</button>
            )}
            <button
              onClick={startEdit}
              style={btnStyle(true)}
            >{values.hasData ? 'Edit values' : 'Add values'}</button>
          </>
        )}
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.5, marginTop: 16 }}>
        Numbers are for planning only — not a substitute for medical advice.
      </p>
    </div>
  )
}

function btnStyle(primary) {
  return {
    padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 11,
    cursor: 'pointer', fontFamily: "var(--font-ui)", minHeight: 40,
    border: primary ? 'none' : '1.5px solid var(--border)',
    background: primary ? 'var(--ink)' : 'white',
    color: primary ? 'white' : 'var(--text-mid)',
    boxShadow: primary ? '0 2px 8px rgba(35,64,142,0.28)' : 'none',
  }
}

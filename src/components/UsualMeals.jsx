import { useState } from 'react'
import Icon from './Icon'
import { usualMealsFor, suggestName, foodsToAdd } from '../lib/usualMeals'

// Usual meals inside the add-food sheet: the saved meals for this meal type, each added in one tap,
// and a way to save the meal being built. Data and limits: lib/usualMeals.js, database.rules.json.
const PLURAL = { breakfast: 'breakfasts', lunch: 'lunches', snack: 'snacks', dinner: 'dinners' }
const label13 = { fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: '18px 0 6px' }
const sameFoods = (a, b) => {
  const key = list => list.map(f => f.id || String(f.name).toLowerCase()).sort().join('|')
  return key(a) === key(b)
}

export function UsualMealsList({ usualMeals, mealKey, mealItems, foodItems, onAdd, onDelete }) {
  const [confirming, setConfirming] = useState(null)
  const meals = usualMealsFor(usualMeals, mealKey)
  if (!meals.length) return null
  const plural = PLURAL[mealKey] || 'meals'

  return (
    <section aria-labelledby="usual-meals">
      <h3 id="usual-meals" style={label13}>Your usual {plural}</h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', background: 'white' }}>
        {meals.map((m, i) => {
          const toAdd = foodsToAdd(m, { mealItems, foodItems })
          const done = toAdd.length === 0
          return (
            <li key={m.id} style={{ display: 'flex', alignItems: 'stretch', borderBottom: i < meals.length - 1 ? '1px solid var(--rule)' : 'none' }}>
              {confirming === m.id ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', minHeight: 56 }}>
                  <span style={{ flex: 1, fontSize: 15 }}>Delete "{m.name}"?</span>
                  <button type="button" onClick={() => { onDelete(m.id); setConfirming(null) }} style={smallBtn(true)}>Delete</button>
                  <button type="button" onClick={() => setConfirming(null)} style={smallBtn(false)}>Keep</button>
                </div>
              ) : (
                <>
                  <button type="button" disabled={done} onClick={() => onAdd(toAdd)} style={{
                    flex: 1, minWidth: 0, minHeight: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                    border: 'none', background: 'transparent', textAlign: 'left', cursor: done ? 'default' : 'pointer', color: 'var(--text-dark)',
                  }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{m.name}</span>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--text-light)', overflowWrap: 'anywhere' }}>{m.foods.map(f => f.name).join(', ')}</span>
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 14, fontWeight: 600, color: done ? 'var(--text-light)' : 'var(--ink)' }}>
                      {done ? 'Added' : 'Add all'}
                    </span>
                  </button>
                  <button type="button" onClick={() => setConfirming(m.id)} aria-label={`Delete usual meal ${m.name}`} style={{
                    flexShrink: 0, width: 44, border: 'none', borderLeft: '1px solid var(--rule)', background: 'transparent',
                    color: 'var(--text-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Icon name="close" size={16} /></button>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function SaveUsualMeal({ usualMeals, mealKey, mealLabel, mealItems, onSave }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saved, setSaved] = useState('')
  const existing = usualMealsFor(usualMeals, mealKey)
  const alreadySaved = existing.find(m => sameFoods(m.foods, mealItems))

  if (mealItems.length < 2) return null
  if (alreadySaved && !open) {
    return <p role="status" style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 8 }}>{saved ? `Saved as "${saved}".` : `This is your "${alreadySaved.name}".`}</p>
  }

  function start() {
    setName(suggestName(mealLabel, existing))
    setOpen(true)
  }

  function save(e) {
    e.preventDefault()
    const meal = onSave(name)
    if (meal) {
      setSaved(meal.name)
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={start} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, marginTop: 4, padding: 0,
        border: 'none', background: 'none', color: 'var(--ink)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
      }}><Icon name="plus" size={16} />Save as a usual {mealLabel.toLowerCase()}</button>
    )
  }

  return (
    <form onSubmit={save} style={{ marginTop: 10, padding: '12px', background: 'var(--ink-light)', display: 'grid', gap: 8 }}>
      <label htmlFor="usual-name" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-hover)' }}>Name this {mealLabel.toLowerCase()}</label>
      <input id="usual-name" value={name} maxLength={60} autoFocus onChange={e => setName(e.target.value)} style={{
        boxSizing: 'border-box', width: '100%', minHeight: 44, padding: '0 12px', fontSize: 16,
        border: '1.5px solid var(--ink-mid)', borderRadius: 'var(--radius)', background: 'white',
      }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={!name.trim()} style={{ ...smallBtn(true), flex: 1, minHeight: 44 }}>Save</button>
        <button type="button" onClick={() => setOpen(false)} style={{ ...smallBtn(false), flex: 1, minHeight: 44 }}>Cancel</button>
      </div>
    </form>
  )
}

function smallBtn(primary) {
  return {
    minHeight: 40, padding: '0 14px', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    border: primary ? 'none' : '1.5px solid var(--border-mid)',
    background: primary ? 'var(--ink)' : 'white', color: primary ? 'var(--on-ink)' : 'var(--text-dark)',
  }
}

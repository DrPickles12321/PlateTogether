import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import BottomSheet from './BottomSheet'
import Modal from './Modal'
import NutritionFacts from './NutritionFacts'
import { SuggestedFoods } from './FoodSidebar'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useAppMode } from '../hooks/useAppMode'
import { searchFoods } from '../lib/foodData'
import { usualFoods, searchFamilyFoods, canAddAsNew, newFoodSuggestions, tidyName, showNewFoods } from '../lib/foodSearch'
import { UsualMealsList, SaveUsualMeal } from './UsualMeals'

// Adding food to a meal in as few taps as possible. Before anything is typed, the family's usual
// foods for this meal are at the top, so most meals are a few taps. One search box finds the
// family's own foods first and only offers a new food when nothing matches.
const TYPES = [
  { key: 'familiar', label: 'Familiar' },
  { key: 'working_on', label: 'Working on' },
  { key: 'challenge', label: 'Challenge' },
]
const TYPE_LABEL = { working_on: 'Working on', challenge: 'Challenge' }
const label13 = { fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: '18px 0 6px' }
const list = { listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', background: 'white' }

function FoodRow({ food, added, onTap, onInfo, last }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', borderBottom: last ? 'none' : '1px solid var(--rule)' }}>
      <button type="button" onClick={() => onTap(food)} aria-pressed={added} style={{
        flex: 1, minWidth: 0, minHeight: 48, display: 'flex', alignItems: 'center', gap: 12, padding: '6px 12px',
        border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'var(--text-dark)',
      }}>
        <span aria-hidden="true" style={{
          flexShrink: 0, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: added ? 'var(--ink)' : 'transparent', border: added ? 'none' : '1.5px solid var(--border-mid)', color: 'var(--on-ink)',
        }}>{added && <Icon name="tick" size={14} strokeWidth={2.6} />}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 16, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{food.name}</span>
          {TYPE_LABEL[food.category] && <span style={{ display: 'block', fontSize: 13, color: 'var(--text-light)' }}>{TYPE_LABEL[food.category]}</span>}
        </span>
      </button>
      {onInfo && (
        <button type="button" onClick={() => onInfo(food)} aria-label={`Nutrition facts for ${food.name}`} style={{
          flexShrink: 0, width: 44, minHeight: 48, border: 'none', borderLeft: '1px solid var(--rule)', background: 'transparent',
          color: 'var(--text-light)', fontSize: 15, fontWeight: 700, fontStyle: 'italic', cursor: 'pointer',
        }}>i</button>
      )}
    </li>
  )
}

function NewRow({ name, hint, onTap, last }) {
  return (
    <li style={{ borderBottom: last ? 'none' : '1px solid var(--rule)' }}>
      <button type="button" onClick={onTap} style={{
        width: '100%', minHeight: 48, display: 'flex', alignItems: 'center', gap: 12, padding: '6px 12px',
        border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'var(--text-dark)',
      }}>
        <span aria-hidden="true" style={{ flexShrink: 0, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}><Icon name="plus" size={18} strokeWidth={2.2} /></span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 16 }}>{name}</span>
        {hint && <span style={{ flexShrink: 0, fontSize: 13, color: 'var(--text-light)' }}>{hint}</span>}
      </button>
    </li>
  )
}

export default function AddFoodSheet({ open, onClose, mealLabel, mealKey, date, allMealItems = {}, mealItems = [], onAddToMeal, onAddManyToMeal, onRemoveFromMeal }) {
  const { foodItems, addFoodItem, setFoodNutrition, resetFoodNutrition, assignedChallenges, usualMeals, saveUsualMeal, deleteUsualMeal } = useFirebaseData()
  const { hideNutritionNumbers } = useAppMode()
  const [query, setQuery] = useState('')
  const [newType, setNewType] = useState('familiar')
  const [usda, setUsda] = useState({ q: '', results: [] })
  const [showIdeas, setShowIdeas] = useState(false)
  const [factsFood, setFactsFood] = useState(null)
  const inputRef = useRef(null)

  const factsLive = factsFood ? foodItems.find(f => f.id === factsFood.id) || factsFood : null
  const inMealIds = new Set(mealItems.map(f => f.id))
  const trimmed = query.trim()
  const ctx = { foods: foodItems, allMealItems, date, mealType: mealKey }
  const usual = usualFoods(ctx)
  const matches = searchFamilyFoods({ ...ctx, query: trimmed })
  const existingNames = foodItems.map(f => f.name)
  const usdaResults = usda.q === trimmed ? usda.results : []
  const newOk = showNewFoods(trimmed, matches.length)
  const others = newOk ? newFoodSuggestions({ query: trimmed, usda: usdaResults, existingNames }) : []
  const offerNew = newOk && canAddAsNew(trimmed, foodItems)
  // When what was typed is exactly a USDA food, the "Add" row carries its group and nutrition.
  const exactUsda = offerNew ? usdaResults.find(r => r.name?.toLowerCase() === tidyName(trimmed).toLowerCase()) : null
  const searchingUsda = newOk && usda.q !== trimmed
  const usualIds = new Set(usual.map(f => f.id))
  const rest = [...foodItems].filter(f => !usualIds.has(f.id)).sort((a, b) => a.name.localeCompare(b.name))

  // USDA results for foods the family doesn't have yet, after a short pause in typing.
  useEffect(() => {
    if (!newOk) return
    let cancelled = false
    const t = setTimeout(async () => {
      const results = await searchFoods(trimmed, 8).catch(() => [])
      if (!cancelled) setUsda({ q: trimmed, results })
    }, 350)
    return () => { cancelled = true; clearTimeout(t) }
  }, [trimmed, newOk])

  function reset() {
    setQuery('')
    setNewType('familiar')
  }

  function close() {
    reset()
    setShowIdeas(false)
    onClose()
  }

  function toggle(food) {
    if (inMealIds.has(food.id)) onRemoveFromMeal(food)
    else onAddToMeal(food)
  }

  function pickFromSearch(food) {
    toggle(food)
    reset()
    inputRef.current?.focus()
  }

  function addNew(payload) {
    const food = addFoodItem({ category: newType, ...payload, name: tidyName(payload.name) })
    if (food) onAddToMeal(food)
    reset()
    inputRef.current?.focus()
  }

  function addTyped() {
    addNew({ name: trimmed, ...(exactUsda ? { group: exactUsda.group, nutrition: exactUsda.nutrition } : {}) })
  }

  function onKeyDown(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (matches.length) pickFromSearch(matches[0])
    else if (offerNew) addTyped()
  }

  return (
    <>
      <BottomSheet
        open={open}
        onClose={close}
        title={`Add to ${mealLabel.toLowerCase()}`}
        footer={
          <button type="button" onClick={close} style={{
            width: '100%', minHeight: 52, borderRadius: 'var(--radius)', border: 'none',
            background: 'var(--ink)', color: 'var(--on-ink)', fontSize: 17, fontWeight: 600, cursor: 'pointer',
          }}>{mealItems.length ? `Done · ${mealItems.length} in ${mealLabel.toLowerCase()}` : 'Done'}</button>
        }
      >
        {/* A steady height, so the sheet doesn't jump while results narrow as you type. */}
        <div style={{ minHeight: '58vh' }}>
        <label htmlFor="food-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search your foods or add a new one</label>
        <input
          id="food-search" ref={inputRef} type="search" value={query} autoComplete="off" enterKeyHint="done"
          onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown}
          placeholder="Search your foods or add a new one"
          style={{
            boxSizing: 'border-box', width: '100%', minHeight: 48, padding: '0 14px', fontSize: 16,
            border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', background: 'white', color: 'var(--text-dark)',
          }}
        />

        {mealItems.length > 0 && (
          <div aria-label={`In ${mealLabel.toLowerCase()}`} role="group" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {mealItems.map(f => (
              <button key={f.id || f.name} type="button" onClick={() => onRemoveFromMeal(f)} aria-label={`Remove ${f.name}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36, padding: '0 8px 0 12px',
                border: 'none', borderRadius: 'var(--radius)', background: 'var(--ink-light)', color: 'var(--ink-hover)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>{f.name}<Icon name="close" size={14} /></button>
            ))}
          </div>
        )}
        {!trimmed && (
          <SaveUsualMeal usualMeals={usualMeals} mealKey={mealKey} mealLabel={mealLabel} mealItems={mealItems}
            onSave={name => saveUsualMeal({ name, mealType: mealKey, foods: mealItems })} />
        )}

        {trimmed ? (
          <>
            {matches.length > 0 && (
              <section aria-labelledby="your-matches">
                <h3 id="your-matches" style={label13}>Your foods</h3>
                <ul style={list}>
                  {matches.map((f, i) => (
                    <FoodRow key={f.id} food={f} added={inMealIds.has(f.id)} onTap={pickFromSearch}
                      onInfo={hideNutritionNumbers ? null : setFactsFood} last={i === matches.length - 1} />
                  ))}
                </ul>
              </section>
            )}

            {(offerNew || others.length > 0) && (
              <section aria-labelledby="new-foods">
                <h3 id="new-foods" style={label13}>{matches.length ? 'Or add a new food' : 'Add a new food'}</h3>
                <div role="group" aria-label="Type for a new food" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4, marginBottom: 8 }}>
                  {TYPES.map(t => (
                    <button key={t.key} type="button" aria-pressed={newType === t.key} onClick={() => setNewType(t.key)} style={{
                      minHeight: 40, borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${newType === t.key ? 'var(--ink)' : 'var(--border)'}`,
                      background: newType === t.key ? 'var(--ink-light)' : 'white', color: newType === t.key ? 'var(--ink-hover)' : 'var(--text-mid)',
                    }}>{t.label}</button>
                  ))}
                </div>
                <ul style={list}>
                  {offerNew && <NewRow name={`Add "${tidyName(trimmed)}"`} hint={exactUsda?.nutrition ? 'USDA' : null} onTap={addTyped} last={others.length === 0} />}
                  {others.map((s, i) => (
                    <NewRow key={s.name} name={s.name} hint={s.nutrition ? 'USDA' : null}
                      onTap={() => addNew({ name: s.name, ...(s.group || s.nutrition ? { group: s.group, nutrition: s.nutrition } : {}) })}
                      last={i === others.length - 1} />
                  ))}
                </ul>
                <p role="status" style={{ fontSize: 13, color: 'var(--text-light)', minHeight: 18, marginTop: 6 }}>
                  {searchingUsda ? 'Looking up more foods…' : ''}
                </p>
              </section>
            )}

            {matches.length === 0 && !offerNew && others.length === 0 && (
              <p style={{ fontSize: 15, color: 'var(--text-mid)', marginTop: 14 }}>Type at least two letters to add a new food.</p>
            )}
          </>
        ) : (
          <>
            <UsualMealsList usualMeals={usualMeals} mealKey={mealKey} mealItems={mealItems}
              foodItems={foodItems} onAdd={foods => onAddManyToMeal?.(foods)} onDelete={deleteUsualMeal} />

            {usual.length > 0 && (
              <section aria-labelledby="usual">
                <h3 id="usual" style={label13}>Usually at {mealLabel.toLowerCase()}</h3>
                <ul style={list}>
                  {usual.map((f, i) => (
                    <FoodRow key={f.id} food={f} added={inMealIds.has(f.id)} onTap={toggle}
                      onInfo={hideNutritionNumbers ? null : setFactsFood} last={i === usual.length - 1} />
                  ))}
                </ul>
              </section>
            )}

            {rest.length > 0 && (
              <section aria-labelledby="all-foods">
                <h3 id="all-foods" style={label13}>{usual.length ? 'All your other foods' : 'Your foods'}</h3>
                <ul style={list}>
                  {rest.map((f, i) => (
                    <FoodRow key={f.id} food={f} added={inMealIds.has(f.id)} onTap={toggle}
                      onInfo={hideNutritionNumbers ? null : setFactsFood} last={i === rest.length - 1} />
                  ))}
                </ul>
              </section>
            )}

            {foodItems.length === 0 && (
              <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, marginTop: 14 }}>
                No foods yet. Type one above to add it, or browse ideas below.
              </p>
            )}

            <button type="button" onClick={() => setShowIdeas(s => !s)} aria-expanded={showIdeas} style={{
              display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, marginTop: 10, padding: 0,
              border: 'none', background: 'none', color: 'var(--ink)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}><Icon name={showIdeas ? 'up' : 'down'} size={16} />Browse food ideas</button>
            {showIdeas && (
              <SuggestedFoods onAdd={payload => addNew(payload)} existingNames={existingNames} buttonSize={40} assignedChallenges={assignedChallenges} />
            )}
          </>
        )}
        </div>
      </BottomSheet>

      <Modal isOpen={!!factsLive} onClose={() => setFactsFood(null)} title={factsLive ? `Nutrition · ${factsLive.name}` : ''} zIndex={70}>
        {factsLive && (
          <NutritionFacts
            food={factsLive}
            onSave={nutrition => setFoodNutrition(factsLive.id, nutrition)}
            onReset={() => resetFoodNutrition(factsLive.id)}
          />
        )}
      </Modal>
    </>
  )
}

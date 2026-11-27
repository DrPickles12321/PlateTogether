import { useState, useEffect, useRef } from 'react'
import Icon from './Icon'
import { useDraggable } from '@dnd-kit/core'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useAppMode } from '../hooks/useAppMode'
import { searchFamilyFoods, canAddAsNew, showNewFoods, tidyName } from '../lib/foodSearch'
import { localIsoDate } from '../lib/constants'
import Modal from './Modal'
import NutritionFacts from './NutritionFacts'
import { searchFoods } from '../lib/foodData'
import { ALL_STARTER_FOODS } from '../lib/starterFoods'

export const CATEGORIES = [
  { key: 'familiar',   label: 'Familiar',   color: 'var(--mint)',  bg: 'var(--mint-light)',  border: 'var(--mint-mid)' },
  { key: 'working_on', label: 'Working On', color: 'var(--peach)', bg: 'var(--peach-light)', border: 'var(--peach-mid)' },
  { key: 'challenge',  label: 'Challenge',  color: 'var(--pink)',  bg: 'var(--pink-light)',  border: 'var(--pink-mid)' },
]

const CATEGORY_KEYS = CATEGORIES.map(c => c.key)
const NO_TYPE = { key: 'none', label: 'No type', color: 'var(--text-mid)', bg: 'var(--surface-warm)', border: 'var(--border)' }

const MOVE_LABELS = { familiar: 'Move to Familiar', working_on: 'Move to Working On', challenge: 'Move to Challenge' }

function FoodCard({ food, onDelete, onChangeCategory }) {
  const [menuOpen, setMenuOpen]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showNutrition, setShowNutrition] = useState(false)
  const { setFoodNutrition, resetFoodNutrition } = useFirebaseData()
  const { hideNutritionNumbers } = useAppMode()
  const menuRef = useRef(null)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: food.id, data: { food } })

  useEffect(() => {
    function onClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.45 : 1 }
    : undefined

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'white', border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '8px 10px', marginBottom: 5,
          transition: isDragging ? 'none' : 'box-shadow 0.15s',
        }}
        onMouseEnter={e => { if (!isDragging) e.currentTarget.style.boxShadow = '0 3px 10px rgba(29,33,43,0.09)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 5px rgba(29,33,43,0.05)' }}
      >
        <span
          {...listeners}
          {...attributes}
          style={{
            fontSize: 13, color: 'var(--text-dark)', flex: 1,
            cursor: 'grab', userSelect: 'none', lineHeight: 1.35,
            fontWeight: 400,
          }}
        >{food.name}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={`More options for ${food.name}`}
            aria-expanded={menuOpen}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-light)', padding: '2px 5px', fontSize: 16, lineHeight: 1,
              borderRadius: 6,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-warm)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          ><Icon name="more" size={18} /></button>
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label={`Remove ${food.name} from your foods`}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--border-mid)', padding: '2px 4px', fontSize: 15, lineHeight: 1,
              borderRadius: 6,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--pink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--border-mid)'}
          ><Icon name="close" size={18} /></button>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 5, zIndex: 50,
              background: 'white', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', minWidth: 168,
            }}>
              {!hideNutritionNumbers && (
                <>
                  <button
                    onClick={() => { setShowNutrition(true); setMenuOpen(false) }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13,
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dark)',
                      display: 'block', fontFamily: "var(--font-ui)",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-warm)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >Nutrition facts</button>
                  <div style={{ height: 1, background: 'var(--border)', margin: '2px 12px' }} />
                </>
              )}
              {Object.entries(MOVE_LABELS).filter(([k]) => k !== food.category).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { onChangeCategory(food, key); setMenuOpen(false) }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13,
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dark)',
                    display: 'block', fontFamily: "var(--font-ui)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-warm)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >{label}</button>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '2px 12px' }} />
              <button
                onClick={() => { setConfirmDelete(true); setMenuOpen(false) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13,
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pink)',
                  display: 'block', fontFamily: "var(--font-ui)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--pink-light)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >Delete</button>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(29,33,43,0.3)',
        }}>
          <div style={{
            background: 'white', borderRadius: 22, padding: '28px',
            maxWidth: 360, margin: '0 16px',
            boxShadow: '0 20px 60px rgba(29,33,43,0.18)',
            border: '1.5px solid var(--border)',
          }}>
            <p style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 22, lineHeight: 1.6 }}>
              This food may be on your weekly plan. Remove it and clear those slots?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: '9px 18px', fontSize: 13, borderRadius: 'var(--radius)',
                  border: '1.5px solid var(--border)', background: 'white',
                  cursor: 'pointer', color: 'var(--text-mid)', fontFamily: "var(--font-ui)",
                }}
              >Cancel</button>
              <button
                onClick={() => { onDelete(food); setConfirmDelete(false) }}
                style={{
                  padding: '9px 18px', fontSize: 13, borderRadius: 'var(--radius)',
                  border: 'none', background: 'var(--pink)', color: 'white',
                  cursor: 'pointer', fontWeight: 600, fontFamily: "var(--font-ui)",
                }}
              >Remove</button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showNutrition} onClose={() => setShowNutrition(false)} title={`Nutrition · ${food.name}`}>
        <NutritionFacts
          food={food}
          onSave={nutrition => setFoodNutrition(food.id, nutrition)}
          onReset={() => resetFoodNutrition(food.id)}
        />
      </Modal>
    </>
  )
}

function Section({ config, foods, onDelete, onChangeCategory }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', borderRadius: 'var(--radius)',
          background: config.bg, border: `1.5px solid ${config.border}`,
          cursor: 'pointer', marginBottom: collapsed ? 0 : 8,
          fontFamily: "var(--font-ui)",
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: config.color }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, display: 'inline-block' }} />
          {config.label}
          <span style={{
            fontSize: 13, fontWeight: 600, color: config.color, opacity: 0.75,
            background: 'white', borderRadius: 6, padding: '1px 7px',
          }}>{foods.length}</span>
        </span>
        <Icon name={collapsed ? 'right' : 'down'} size={16} style={{ color: 'var(--text-mid)' }} />
      </button>

      {!collapsed && (
        <div>
          {foods.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-light)', padding: '3px 4px 8px', fontStyle: 'italic' }}>
              No foods yet
            </p>
          )}
          {foods.map(food => (
            <FoodCard key={food.id} food={food} onDelete={onDelete} onChangeCategory={onChangeCategory} />
          ))}
        </div>
      )}
    </div>
  )
}

// Prefix match: 2 = the whole name starts with the query, 1 = a word in the
// name starts with it, 0 = no match. Used to filter + rank "starts with" search.
function prefixRank(name, q) {
  if (!q) return 2
  const n = name.toLowerCase()
  if (n.startsWith(q)) return 2
  if (n.split(/[\s,()/-]+/).some(w => w.startsWith(q))) return 1
  return 0
}

// One food idea: its name, then labelled buttons to add it with no type or as a type. Words, not
// coloured dots, so the choices can be told apart without colour or a hover tooltip.
const ADD_AS = [
  { key: null, label: '+ No type' },
  { key: 'familiar', label: 'Familiar' },
  { key: 'working_on', label: 'Working on' },
  { key: 'challenge', label: 'Challenge' },
]

function SuggestRow({ name, buttonSize, onAdd, extra }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
      <span style={{ display: 'block', fontSize: 14, color: 'var(--text-dark)', marginBottom: 6, overflowWrap: 'anywhere' }}>{name}</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(68px, 1fr))', gap: 4 }}>
        {ADD_AS.map(t => (
          <button
            key={t.label}
            type="button"
            aria-label={t.key ? `Add ${name} as ${t.label}` : `Add ${name} without a type`}
            onClick={() => onAdd({ name, ...(t.key ? { category: t.key } : {}), ...extra })}
            style={{
              minHeight: Math.max(buttonSize, 32), padding: '0 2px', borderRadius: 'var(--radius)',
              border: '1px solid var(--border-mid)', background: t.key ? 'white' : 'var(--ink-light)',
              color: t.key ? 'var(--text-mid)' : 'var(--ink-hover)', fontSize: 12, fontWeight: 600, lineHeight: 1.15, cursor: 'pointer',
            }}
          >{t.label}</button>
        ))}
      </div>
    </div>
  )
}

export function SuggestedFoods({ onAdd, existingNames, buttonSize = 22, assignedChallenges = [] }) {
  const [query, setQuery] = useState('')
  const [usdaResults, setUsdaResults] = useState([])
  const [searching, setSearching] = useState(false)
  const q = query.trim().toLowerCase()
  const existingLower = new Set(existingNames.map(n => n.toLowerCase()))

  // Starter ideas, filtered to "starts with" matches — flat list (no type split).
  const curatedNamesList = ALL_STARTER_FOODS.map(name => ({ name }))
    .filter(f => !existingLower.has(f.name.toLowerCase()) && prefixRank(f.name, q) > 0)
    .map(f => f.name)
    .sort((a, b) => prefixRank(b, q) - prefixRank(a, q) || a.localeCompare(b))

  // Live USDA search for many more options (only when the Worker is configured).
  useEffect(() => {
    if (q.length < 2) { setUsdaResults([]); setSearching(false); return }
    let cancelled = false
    setSearching(true)
    const t = setTimeout(async () => {
      const results = await searchFoods(query.trim(), 20)
      if (cancelled) return
      const curatedNames = new Set(ALL_STARTER_FOODS.map(n => n.toLowerCase()))
      const ranked = results
        .filter(r => !existingLower.has(r.name.toLowerCase()) && !curatedNames.has(r.name.toLowerCase()) && prefixRank(r.name, q) > 0)
        .sort((a, b) => prefixRank(b.name, q) - prefixRank(a.name, q) || a.name.localeCompare(b.name))
      setUsdaResults(ranked)
      setSearching(false)
    }, 350)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const curatedCount = curatedNamesList.length
  const showMore = searching || usdaResults.length > 0

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search foods…"
        style={{
          width: '100%', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '9px 12px', fontSize: 13, color: 'var(--text-dark)', outline: 'none',
          boxSizing: 'border-box', fontFamily: "var(--font-ui)",
          background: 'var(--surface-warm)', marginBottom: 12,
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--coral)'; e.target.style.boxShadow = '0 0 0 3px rgba(35,64,142,0.1)' }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
      />

      {!q && (
        <p style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.5, marginBottom: 10 }}>
          Add a food with no type, or give it one now. You can change it later on a computer.
        </p>
      )}

      {/* Clinician-assigned challenge foods, pinned above everything else. */}
      {(() => {
        const pinned = assignedChallenges.filter(c =>
          !existingLower.has(c.name.toLowerCase()) && (!q || prefixRank(c.name, q) > 0)
        )
        if (pinned.length === 0) return null
        return (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pink)', marginBottom: 7 }}>
              From your clinician
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {pinned.map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--pink-light)', border: '1.5px solid var(--pink-mid)',
                  borderRadius: 'var(--radius)', padding: '8px 10px', gap: 8,
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                  <button
                    onClick={() => onAdd({ name: c.name, category: 'challenge' })}
                    aria-label={`Add challenge food ${c.name}`}
                    style={{
                      border: 'none', borderRadius: 'var(--radius)', padding: '6px 12px',
                      background: 'var(--pink)', color: 'white', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', flexShrink: 0, minHeight: Math.max(buttonSize, 28),
                      fontFamily: "var(--font-ui)",
                    }}
                  >+ Add</button>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {curatedNamesList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
          {curatedNamesList.map(name => (
            <SuggestRow key={name} name={name} buttonSize={buttonSize} onAdd={onAdd} />
          ))}
        </div>
      )}

      {showMore && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-light)', marginBottom: 7 }}>
            More foods{searching ? ' · searching…' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {usdaResults.map(r => (
              <SuggestRow key={r.name} name={r.name} buttonSize={buttonSize} onAdd={onAdd} extra={{ group: r.group, nutrition: r.nutrition }} />
            ))}
          </div>
        </div>
      )}

      {q && curatedCount === 0 && !showMore && (
        <p style={{ fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic' }}>
          No matches. You can still add “{query.trim()}” from the My List tab.
        </p>
      )}
    </div>
  )
}

const NEW_TYPES = [
  { key: null, label: 'No type' },
  { key: 'familiar', label: 'Familiar' },
  { key: 'working_on', label: 'Working on' },
  { key: 'challenge', label: 'Challenge' },
]

export default function FoodSidebar() {
  const { foodItems, allMealItems = {}, addFoodItem, deleteFoodItem, updateFoodItemCategory, assignedChallenges } = useFirebaseData()
  const [tab, setTab] = useState('mine')
  const [query, setQuery] = useState('')
  const [newType, setNewType] = useState('familiar')

  // One box that filters the family's list as you type and offers "Add …" only when the food
  // isn't there yet (same ranking as the add-food sheet, lib/foodSearch.js).
  const trimmed = query.trim()
  const matches = trimmed ? searchFamilyFoods({ foods: foodItems, allMealItems, date: localIsoDate(), query: trimmed }) : foodItems
  const offerNew = showNewFoods(trimmed, trimmed ? matches.length : 1) && canAddAsNew(trimmed, foodItems)

  function handleAddFood(payload) {
    addFoodItem(payload)
  }

  function addTyped() {
    if (!offerNew) return
    addFoodItem({ name: tidyName(trimmed), category: newType })
    setQuery('')
    setNewType('familiar')
  }

  function handleDelete(food) {
    deleteFoodItem(food.id)
  }

  function handleChangeCategory(food, newCategory) {
    updateFoodItemCategory(food.id, newCategory)
  }

  const existingNames = foodItems.map(f => f.name)

  return (
    <div style={{ padding: '20px 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="font-lora" style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-dark)', marginBottom: 14 }}>
        Our Foods
      </h2>

      <div style={{
        display: 'flex', gap: 4, background: 'var(--surface-warm)',
        borderRadius: 'var(--radius)', padding: 3, marginBottom: 14,
      }}>
        {[{ key: 'mine', label: 'My List' }, { key: 'suggested', label: 'Suggested' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '6px 4px', borderRadius: 'var(--radius)', border: 'none',
              background: tab === t.key ? 'white' : 'transparent',
              color: tab === t.key ? 'var(--coral)' : 'var(--text-light)',
              fontWeight: 600, fontSize: 12, cursor: 'pointer',
              boxShadow: tab === t.key ? '0 1px 5px rgba(29,33,43,0.08)' : 'none',
              fontFamily: "var(--font-ui)", transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'mine' ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="sidebar-food-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Find or add a food</label>
            <input
              id="sidebar-food-search" type="search" value={query} autoComplete="off"
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTyped() } }}
              placeholder="Find or add a food"
              style={{
                boxSizing: 'border-box', width: '100%', minHeight: 44, padding: '0 12px', fontSize: 15,
                border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', background: 'white', color: 'var(--text-dark)',
              }}
            />
            {offerNew && (
              <div style={{ marginTop: 8 }}>
                <div role="group" aria-label="Type for the new food" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4, marginBottom: 6 }}>
                  {NEW_TYPES.map(t => (
                    <button key={t.label} type="button" aria-pressed={newType === t.key} onClick={() => setNewType(t.key)} style={{
                      minHeight: 36, padding: '0 2px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${newType === t.key ? 'var(--ink)' : 'var(--border)'}`,
                      background: newType === t.key ? 'var(--ink-light)' : 'white', color: newType === t.key ? 'var(--ink-hover)' : 'var(--text-mid)',
                    }}>{t.label}</button>
                  ))}
                </div>
                <button type="button" onClick={addTyped} style={{
                  width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  borderRadius: 'var(--radius)', border: 'none', background: 'var(--ink)', color: 'var(--on-ink)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}><Icon name="plus" size={16} />Add "{tidyName(trimmed)}"</button>
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {CATEGORIES.map(cfg => {
              const foods = matches.filter(f => f.category === cfg.key)
              if (trimmed && foods.length === 0) return null
              return (
                <Section
                  key={cfg.key}
                  config={cfg}
                  foods={foods}
                  onDelete={handleDelete}
                  onChangeCategory={handleChangeCategory}
                />
              )
            })}
            {(() => {
              const foods = matches.filter(f => !CATEGORY_KEYS.includes(f.category))
              if (foods.length === 0) return null
              return <Section key="none" config={NO_TYPE} foods={foods} onDelete={handleDelete} onChangeCategory={handleChangeCategory} />
            })()}
            {trimmed && matches.length === 0 && !offerNew && (
              <p style={{ fontSize: 13, color: 'var(--text-light)' }}>Type at least two letters to add a new food.</p>
            )}
          </div>
        </>
      ) : (
        <SuggestedFoods onAdd={handleAddFood} existingNames={existingNames} assignedChallenges={assignedChallenges} />
      )}
    </div>
  )
}

import { Fragment, useEffect, useState, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import FoodSidebar from '../components/FoodSidebar'
import FoodCardPreview from '../components/FoodCardPreview'
import SupplementChecklist from '../components/SupplementChecklist'
import AddFoodSheet from '../components/AddFoodSheet'
import { useIsMobile } from '../hooks/useIsMobile'
import { lookupNutrition } from '../lib/nutritionService'
import { useNutritionalTargets } from '../contexts/NutritionalTargetsContext'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { getWeekDates, localIsoDate } from '../lib/constants'
import DistressScale from '../components/DistressScale'
import QuickLogSheet from '../components/QuickLogSheet'
import HelpSheet from '../components/HelpSheet'
import HardMomentCard from '../components/HardMomentCard'
import Icon, { OutcomeMark } from '../components/Icon'
import { useAppMode } from '../hooks/useAppMode'
import { sameAsYesterday, recentFoods } from '../lib/quickLog'
import { OUTCOME_META, OUTCOME_ORDER, needsSupport, outcomeLabel } from '../lib/outcomes'
import { hardMealNote } from '../lib/supportCopy'

// Width of the notebook margin on the Today page: meal times sit here, left of the rose line.
const MARGIN = 56

const weekNavBtn = {
  width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 'var(--radius)', border: '1px solid var(--border-mid)', background: 'white',
  color: 'var(--text-dark)', cursor: 'pointer',
}

function shortDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function NeedHelpButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '8px 14px', flexShrink: 0,
        borderRadius: 'var(--radius)', border: '1.5px solid var(--ink)', background: 'white',
        color: 'var(--ink)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
      }}
    ><Icon name="help" size={18} />Need help</button>
  )
}

function DayStepButton({ dir, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir < 0 ? 'Previous day' : 'Next day'}
      style={{
        width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius)', border: '1px solid var(--border-mid)', background: 'white',
        color: 'var(--text-dark)', cursor: 'pointer',
      }}
    ><Icon name={dir < 0 ? 'left' : 'right'} size={20} /></button>
  )
}

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

const DEFAULT_MEAL_TIMES = {
  breakfast: '08:00',
  lunch: '13:00',
  snack: '15:30',
  dinner: '19:00',
}

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', color: 'var(--coral)', bg: 'var(--coral-light)' },
  { key: 'lunch',     label: 'Lunch',     color: 'var(--peach)', bg: 'var(--peach-light)' },
  { key: 'snack',     label: 'Snack',     color: 'var(--pink)',  bg: 'var(--pink-light)' },
  { key: 'dinner',    label: 'Dinner',    color: 'var(--mint)',  bg: 'var(--mint-light)' },
]

// How much of the food was eaten. Stored as a fraction on the meal item so the
// clinician sees amounts and the energy estimate can scale. Unset = assume full.
const PORTION_OPTIONS = [
  { value: 0.25, label: '¼' },
  { value: 0.5,  label: '½' },
  { value: 0.75, label: '¾' },
  { value: 1,    label: 'All' },
]
export const PORTION_LABEL = { 0.25: '¼', 0.5: '½', 0.75: '¾', 1: 'all' }

const RING_NUTRIENTS = [
  { key: 'protein',       label: 'Protein', color: 'var(--ink)', darkColor: 'var(--ink)', getVal: info => info.protein_g || 0 },
  { key: 'carbs',         label: 'Carbs',   color: 'var(--st-some)', darkColor: 'var(--st-some)', getVal: info => info.carbs_g || 0 },
  { key: 'fruitsVeggies', label: 'F&V',     color: 'var(--mint)', darkColor: 'var(--mint)', getVal: info => info.plate_zone === 'produce' ? 80 : 0 },
]

const EMPTY_MEAL_ITEMS = { breakfast: [], lunch: [], snack: [], dinner: [] }

// Keep the drag preview centered on the cursor (instead of dnd-kit's default
// of preserving the grab offset, which makes the label float above the mouse).
function snapCenterToCursor({ activatorEvent, draggingNodeRect, transform }) {
  if (!draggingNodeRect || !activatorEvent) return transform
  const x = activatorEvent.clientX
  const y = activatorEvent.clientY
  if (typeof x !== 'number' || typeof y !== 'number') return transform
  return {
    ...transform,
    x: transform.x + x - draggingNodeRect.left - draggingNodeRect.width / 2,
    y: transform.y + y - draggingNodeRect.top - draggingNodeRect.height / 2,
  }
}

function getTodayKey() {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return days[new Date().getDay()]
}

const TODAY_ISO = localIsoDate()

function parseTimeValue(value) {
  const [hour = '08', minute = '00'] = (value || '08:00').split(':')
  const numericHour = Number(hour)
  const displayHour = numericHour % 12 === 0 ? 12 : numericHour % 12
  return {
    hour: String(displayHour),
    minute: String(minute).padStart(2, '0'),
    period: numericHour >= 12 ? 'PM' : 'AM',
  }
}

function build24HourTime(hourValue, minuteValue, period) {
  const hour = Number(hourValue)
  const minute = Number(minuteValue)
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null
  const normalizedHour = period === 'PM'
    ? (hour === 12 ? 12 : hour + 12)
    : (hour === 12 ? 0 : hour)
  return `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// ─── Drop zone: always droppable, renders food chips ─────────────────────────

function DropZone({ mealType, items, onRemove, onFoodClick, selectedFoodIndex, isSkipped }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `meal-${mealType}`,
    data: { mealType },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1, minHeight: 48, borderRadius: 12,
        border: items.length === 0
          ? `1.5px dashed ${isOver ? 'var(--coral)' : isSkipped ? 'var(--border)' : 'var(--pink-mid)'}`
          : '1.5px solid var(--border-mid)',
        background: isOver ? 'var(--coral-light)' : items.length > 0 ? 'var(--surface-warm)' : isSkipped ? 'var(--surface-warm)' : 'transparent',
        padding: items.length > 0 ? '8px 10px' : '0 14px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
        transition: 'all 0.15s',
      }}
    >
      {items.length === 0 ? (
        <span style={{ fontSize: 12, color: isOver ? 'var(--coral)' : isSkipped ? 'var(--text-light)' : 'var(--text-light)' }}>
          {isOver ? 'Drop here ↓' : isSkipped ? '⊘ Skipped — no food eaten' : '+ drag a food here'}
        </span>
      ) : (
        <>
          {items.map((food, i) => (
            <span
              key={i}
              onClick={e => { e.stopPropagation(); onFoodClick?.(i) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'white', border: '1px solid var(--border-mid)',
                borderRadius: 8, padding: '4px 8px 4px 10px',
                fontSize: 13, fontWeight: 500, color: 'var(--text-dark)',
                boxShadow: '0 1px 3px rgba(29,33,43,0.06)',
                cursor: 'pointer',
                outline: selectedFoodIndex === i ? '2px solid var(--ink)' : 'none',
                outlineOffset: 1,
              }}
            >
              {food.status && (
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: food.status === 'okay' ? 'var(--mint)'
                    : food.status === 'difficult' ? 'var(--st-some)'
                    : 'var(--st-refused)',
                  display: 'inline-block',
                }} />
              )}
              {food.name}
              {food.portion != null && food.portion < 1 && (
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--peach)', flexShrink: 0 }}>
                  {PORTION_LABEL[food.portion]}
                </span>
              )}
              <button
                onClick={e => { e.stopPropagation(); onRemove(i) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-light)', fontSize: 16, lineHeight: 1,
                  padding: '0 2px', display: 'flex', alignItems: 'center',
                  fontFamily: 'inherit',
                }}
              >×</button>
            </span>
          ))}
          {isOver && (
            <span style={{ fontSize: 12, color: 'var(--coral)', fontWeight: 500, opacity: 0.8 }}>
              + drop here
            </span>
          )}
        </>
      )}
    </div>
  )
}

// ─── Meal card ────────────────────────────────────────────────────────────────

function MealCard({ meal, items, onRemove, latestLog, onQuickLog, time, onTimeChange, selectedFoodIndex, onFoodClick, onFoodStatusSet, onFoodPortionSet, distress, onDistressSet }) {
  const loggedStatus = latestLog?.status || null
  const hasItems = items.length > 0
  const initialTime = parseTimeValue(time)
  const [pendingTime, setPendingTime] = useState(initialTime)
  const [lastValidHour, setLastValidHour] = useState(initialTime.hour)

  useEffect(() => {
    const nextTime = parseTimeValue(time)
    setPendingTime(nextTime)
    setLastValidHour(nextTime.hour)
  }, [time])

  const handleHourChange = value => {
    const next = value.replace(/[^0-9]/g, '').slice(0, 2)
    if (next === '') { setPendingTime(prev => ({ ...prev, hour: '' })); return }
    const numeric = Number(next)
    if (numeric === 0) { setPendingTime(prev => ({ ...prev, hour: next })); return }
    if (numeric >= 1 && numeric <= 12) {
      setPendingTime(prev => ({ ...prev, hour: String(numeric) }))
      setLastValidHour(String(numeric))
    }
  }

  const handleHourBlur = () => {
    const hourText = pendingTime.hour.trim() || lastValidHour
    const nextTime = build24HourTime(hourText, pendingTime.minute, pendingTime.period)
    if (nextTime) {
      setPendingTime(prev => ({ ...prev, hour: String(Number(hourText)) }))
      setLastValidHour(String(Number(hourText)))
      onTimeChange(meal.key, nextTime)
    }
  }

  const handleMinuteChange = value => {
    setPendingTime(prev => ({ ...prev, minute: value.replace(/[^0-9]/g, '').slice(0, 2) }))
  }

  const handleMinuteBlur = () => {
    const minuteText = pendingTime.minute.trim() || '00'
    const nextTime = build24HourTime(pendingTime.hour || '1', minuteText, pendingTime.period)
    if (nextTime) {
      setPendingTime(prev => ({ ...prev, minute: String(Number(minuteText)).padStart(2, '0') }))
      onTimeChange(meal.key, nextTime)
    }
  }

  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius)',
      border: '1px solid var(--rule-strong)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--rule)',
      }}>
        <h3 className="font-hand" style={{ fontWeight: 600, fontSize: 19, color: 'var(--text-dark)' }}>{meal.label}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', padding: '4px 8px' }}>
          {(() => {
            const { hour, minute, period } = pendingTime
            const setPeriod = nextPeriod => {
              const nextTime = build24HourTime(hour || lastValidHour, minute || '00', nextPeriod)
              if (nextTime) onTimeChange(meal.key, nextTime)
              setPendingTime(prev => ({ ...prev, period: nextPeriod }))
            }
            return (
              <>
                <input type="text" inputMode="numeric" value={hour} aria-label={`${meal.label} hour`}
                  onChange={e => handleHourChange(e.target.value)} onBlur={handleHourBlur}
                  style={{ width: 24, border: 'none', background: 'transparent', color: 'var(--text-dark)', fontSize: 14, fontWeight: 600, textAlign: 'center' }}
                />
                <span style={{ color: 'var(--text-dark)', fontSize: 14, fontWeight: 600 }}>:</span>
                <input type="text" inputMode="numeric" value={minute} aria-label={`${meal.label} minutes`}
                  onChange={e => handleMinuteChange(e.target.value)} onBlur={handleMinuteBlur}
                  style={{ width: 28, border: 'none', background: 'transparent', color: 'var(--text-dark)', fontSize: 14, fontWeight: 600, textAlign: 'center' }}
                />
                <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                  {['AM', 'PM'].map(option => (
                    <button key={option} type="button" onClick={() => setPeriod(option)} aria-pressed={period === option} style={{
                      borderRadius: 4, border: 'none', padding: '4px 7px',
                      background: period === option ? 'var(--ink)' : 'transparent',
                      color: period === option ? 'white' : 'var(--text-mid)',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>{option}</button>
                  ))}
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <DropZone
            mealType={meal.key}
            items={items}
            onRemove={onRemove}
            onFoodClick={onFoodClick}
            selectedFoodIndex={selectedFoodIndex}
            isSkipped={loggedStatus === 'skipped'}
          />
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, paddingTop: items.length > 1 ? 4 : 0 }}>
            {OUTCOME_ORDER.map(key => {
              const opt = OUTCOME_META[key]
              const isSkip = key === 'skipped'
              const enabled = isSkip ? !hasItems : hasItems
              const selected = loggedStatus === key
              return (
                <button
                  key={key}
                  onClick={() => enabled && onQuickLog(selected ? null : key)}
                  disabled={!enabled}
                  aria-pressed={selected}
                  title={!enabled ? (isSkip ? 'Remove the foods to mark this meal skipped' : 'Add what was served first') : undefined}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '7px 8px', borderRadius: 'var(--radius)', minWidth: 64, minHeight: 52,
                    border: `1.5px solid ${selected ? opt.color : 'var(--border-mid)'}`,
                    background: selected ? opt.bg : 'white',
                    color: enabled ? opt.color : 'var(--text-light)',
                    cursor: enabled ? 'pointer' : 'not-allowed',
                    opacity: enabled ? 1 : 0.55,
                    fontSize: 13, fontWeight: 700,
                  }}
                >
                  <OutcomeMark mark={opt.mark} size={16} color="currentColor" />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {loggedStatus && loggedStatus !== 'skipped' && (
          <DistressScale distress={distress} onSet={onDistressSet} />
        )}

        {selectedFoodIndex != null && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              marginTop: 6,
              background: 'var(--surface-warm)',
              border: '1px solid var(--border-mid)',
              borderRadius: 10,
              padding: '7px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-light)', alignSelf: 'center', marginRight: 4 }}>
              {items[selectedFoodIndex]?.name}:
            </span>
            {['okay', 'difficult', 'refused'].map(key => {
              const opt = OUTCOME_META[key]
              const isSelected = items[selectedFoodIndex]?.status === key
              return (
                <button
                  key={key}
                  onClick={() => onFoodStatusSet?.(meal.key, selectedFoodIndex, isSelected ? null : key)}
                  aria-pressed={isSelected}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 36,
                    padding: '5px 10px', borderRadius: 'var(--radius)',
                    border: `1.5px solid ${isSelected ? opt.color : 'var(--border-mid)'}`,
                    background: isSelected ? opt.bg : 'white', color: opt.color,
                    cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  }}
                >
                  <OutcomeMark mark={opt.mark} size={14} color="currentColor" />
                  {opt.label}
                </button>
              )
            })}
            <span style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 3px', alignSelf: 'center' }} />
            <span style={{ fontSize: 12, color: 'var(--text-light)', alignSelf: 'center', marginRight: 1 }}>ate</span>
            {PORTION_OPTIONS.map(p => {
              const sel = items[selectedFoodIndex]?.portion === p.value
              return (
                <button
                  key={p.value}
                  title={`Ate ${p.label}`}
                  onClick={() => onFoodPortionSet?.(meal.key, selectedFoodIndex, sel ? null : p.value)}
                  style={{
                    minWidth: 28, padding: '6px 7px', borderRadius: 8, border: 'none',
                    background: sel ? 'var(--border)' : 'white', outline: sel ? '2px solid var(--peach)' : 'none',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    color: sel ? 'var(--peach)' : 'var(--text-mid)', fontFamily: 'inherit',
                  }}
                >{p.label}</button>
              )
            })}
            <button
              onClick={e => { e.stopPropagation(); onFoodClick?.(selectedFoodIndex) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-light)', fontSize: 16, alignSelf: 'center',
                padding: '0 2px', fontFamily: 'inherit',
              }}
            >×</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Mobile meal card: collapsed summary, tap to expand ─────────────────────

function MobileMealCard({
  meal, items, latestLog, onQuickLog, time, onTimeChange,
  expanded, onToggleExpand, onOpenAddFood, onRemove,
  selectedFoodIndex, onFoodClick, onFoodStatusSet, onFoodPortionSet,
  distress, onDistressSet,
  onOpenLog, yesterdayItems = [], recentList = [], onAddItems,
}) {
  const loggedStatus = latestLog?.status || null
  const hasItems = items.length > 0
  const isSkipped = loggedStatus === 'skipped'
  const outcome = OUTCOME_META[loggedStatus]
  const { hour, minute, period } = parseTimeValue(time)
  const timeLabel = `${hour}:${minute}`
  const foodSummary = items.map(f => f.name).join(', ')
  const bodyId = `meal-${meal.key}-details`

  return (
    <div style={{ borderBottom: '1px solid var(--rule)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `${MARGIN}px 1fr auto`, alignItems: 'center', minHeight: 64 }}>
        <span style={{ fontSize: 13, color: 'var(--text-mid)', textAlign: 'center', lineHeight: 1.2 }}>
          {timeLabel}<br /><span style={{ fontSize: 13 }}>{period}</span>
        </span>

        <button
          onClick={onToggleExpand}
          aria-expanded={expanded}
          aria-controls={bodyId}
          style={{
            all: 'unset', boxSizing: 'border-box', cursor: 'pointer', padding: '12px 10px 12px 14px',
            minWidth: 0, minHeight: 64, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}
        >
          <span className="font-hand" style={{ fontSize: 19, fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.25 }}>{meal.label}</span>
          <span style={{
            fontSize: 14, color: hasItems ? 'var(--ink)' : 'var(--text-mid)', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {hasItems ? foodSummary : isSkipped ? 'Skipped' : 'Not written yet'}
          </span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 12 }}>
          {loggedStatus ? (
            <button
              onClick={onOpenLog}
              aria-label={`${meal.label}: ${outcome?.label}. Change`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '6px 12px',
                borderRadius: 'var(--radius)', border: `1.5px solid ${outcome?.color}`, background: outcome?.bg,
                color: outcome?.color, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            ><OutcomeMark mark={outcome?.mark} size={16} color={outcome?.color} />{outcome?.label}</button>
          ) : (
            <>
              {!hasItems && (
                <button
                  onClick={() => onQuickLog('skipped')}
                  aria-label={`Skip ${meal.label}`}
                  style={{
                    minHeight: 44, minWidth: 44, padding: '6px 10px', borderRadius: 'var(--radius)',
                    border: 'none', background: 'none', color: 'var(--text-mid)', fontSize: 14,
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >Skip</button>
              )}
              <button
                onClick={onOpenLog}
                aria-label={`Log ${meal.label}`}
                style={{
                  minHeight: 44, padding: '6px 18px', borderRadius: 'var(--radius)', border: 'none',
                  background: 'var(--ink)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}
              >Log</button>
            </>
          )}
        </div>
      </div>

      {/* One-tap repeat of yesterday's meal, shown without expanding */}
      {!hasItems && !isSkipped && yesterdayItems.length > 0 && (
        <div style={{ padding: `0 12px 12px ${MARGIN + 14}px` }}>
          <button
            onClick={() => onAddItems(yesterdayItems)}
            style={{
              width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
              borderRadius: 'var(--radius)', border: '1.5px dashed var(--ink-mid)', background: 'white',
              color: 'var(--ink)', padding: '8px 12px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Icon name="repeat" size={18} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Same as yesterday: {yesterdayItems.map(f => f.name).join(', ')}
            </span>
          </button>
        </div>
      )}

      {expanded && (
        <div id={bodyId} style={{ padding: `4px 12px 18px ${MARGIN + 14}px` }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-mid)', marginBottom: 12 }}>
            <Icon name="clock" size={18} />
            Time
            <input
              type="time"
              value={time}
              onChange={e => e.target.value && onTimeChange(meal.key, e.target.value)}
              style={{
                minHeight: 40, border: '1.5px solid var(--border-mid)', background: 'white', borderRadius: 'var(--radius)',
                padding: '6px 10px', fontSize: 16, color: 'var(--text-dark)',
              }}
            />
          </label>

          <h4 style={sectionLabel}>What was served</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {items.length === 0 ? (
              <span style={{ fontSize: 14, color: 'var(--text-mid)', padding: '4px 0' }}>Nothing written yet.</span>
            ) : items.map((food, i) => {
              const fm = OUTCOME_META[food.status]
              return (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', borderRadius: 'var(--radius)',
                  border: '1px solid var(--border-mid)', background: 'white',
                  outline: selectedFoodIndex === i ? '2px solid var(--ink)' : 'none', outlineOffset: 1,
                }}>
                  <button
                    onClick={() => onFoodClick(i)}
                    aria-pressed={selectedFoodIndex === i}
                    aria-label={`${food.name}${fm ? `, ${fm.label}` : ''}. Set how much was eaten`}
                    style={{
                      all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                      minHeight: 44, padding: '0 4px 0 12px', fontSize: 15, color: 'var(--text-dark)',
                    }}
                  >
                    {fm && <OutcomeMark mark={fm.mark} size={14} color={fm.color} />}
                    {food.name}
                    {food.portion != null && food.portion < 1 && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--st-some)' }}>{PORTION_LABEL[food.portion]}</span>
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(i)}
                    aria-label={`Remove ${food.name}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44,
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mid)', padding: 0,
                    }}
                  ><Icon name="close" size={16} /></button>
                </span>
              )
            })}
          </div>

          {selectedFoodIndex != null && items[selectedFoodIndex] && (
            <div style={{ background: 'var(--surface-warm)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px', marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 8 }}>{items[selectedFoodIndex].name}</div>
              <div role="group" aria-label="How it went" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {['okay', 'difficult', 'refused'].map(key => {
                  const m = OUTCOME_META[key]
                  const isSelected = items[selectedFoodIndex]?.status === key
                  return (
                    <button
                      key={key}
                      onClick={() => onFoodStatusSet(meal.key, selectedFoodIndex, isSelected ? null : key)}
                      aria-pressed={isSelected}
                      style={choice(isSelected, m.color, m.bg)}
                    ><OutcomeMark mark={m.mark} size={14} color={m.color} />{m.label}</button>
                  )
                })}
              </div>
              <div role="group" aria-label="How much was eaten" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--text-mid)', marginRight: 2 }}>Ate</span>
                {PORTION_OPTIONS.map(p => {
                  const sel = items[selectedFoodIndex]?.portion === p.value
                  return (
                    <button
                      key={p.value}
                      onClick={() => onFoodPortionSet?.(meal.key, selectedFoodIndex, sel ? null : p.value)}
                      aria-pressed={sel}
                      style={{ ...choice(sel, 'var(--ink)', 'var(--ink-light)'), minWidth: 48, justifyContent: 'center' }}
                    >{p.label}</button>
                  )
                })}
              </div>
            </div>
          )}

          {recentList.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <h4 style={sectionLabel}>Recent</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {recentList.map(food => (
                  <button
                    key={food.id || food.name}
                    onClick={() => onAddItems([food])}
                    aria-label={`Add ${food.name}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 44, padding: '6px 12px',
                      borderRadius: 'var(--radius)', fontSize: 15, border: '1px solid var(--border-mid)',
                      background: 'white', color: 'var(--text-dark)', cursor: 'pointer',
                    }}
                  ><Icon name="plus" size={14} />{food.name}</button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onOpenAddFood}
            style={{
              width: '100%', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderRadius: 'var(--radius)', border: '1.5px dashed var(--ink-mid)', background: 'white',
              color: 'var(--ink)', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 16,
            }}
          ><Icon name="plus" size={18} />Add food</button>

          <h4 style={sectionLabel}>How it went</h4>
          <div role="group" aria-label={`How ${meal.label} went`} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {OUTCOME_ORDER.map(key => {
              const m = OUTCOME_META[key]
              const isSkip = key === 'skipped'
              const enabled = isSkip ? !hasItems : hasItems
              const selected = loggedStatus === key
              return (
                <button
                  key={key}
                  onClick={() => enabled && onQuickLog(selected ? null : key)}
                  disabled={!enabled}
                  aria-pressed={selected}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    minHeight: 56, borderRadius: 'var(--radius)',
                    border: `1.5px solid ${selected ? m.color : 'var(--border-mid)'}`,
                    background: selected ? m.bg : 'white', color: enabled ? m.color : 'var(--text-light)',
                    cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.55,
                    fontSize: 14, fontWeight: 700,
                  }}
                ><OutcomeMark mark={m.mark} size={18} color="currentColor" />{m.label}</button>
              )
            })}
          </div>
          {!hasItems && (
            <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 6 }}>Add what was served to mark how it went.</p>
          )}

          {loggedStatus && loggedStatus !== 'skipped' && (
            <div style={{ marginTop: 14 }}>
              <DistressScale distress={distress} onSet={onDistressSet} compact />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const sectionLabel = { fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 8px' }

function choice(selected, color, bg) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '6px 12px',
    borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
    border: `1.5px solid ${selected ? color : 'var(--border-mid)'}`,
    background: selected ? bg : 'white', color: selected ? color : 'var(--text-dark)',
  }
}

// ─── Mobile supplements: collapsible "N of M" row ────────────────────────────

function MobileSupplements({ checkedSupplements, onToggleChecked, prescribedSupplements }) {
  const [open, setOpen] = useState(false)
  const total = prescribedSupplements.length
  const done = prescribedSupplements.filter(n => checkedSupplements.has(n)).length

  // When nothing is prescribed yet, still show the section (matches desktop)
  // rather than hiding supplements entirely.
  if (total === 0) {
    return (
      <div style={{ marginTop: 14 }}>
        <SupplementChecklist
          checkedSupplements={checkedSupplements}
          onToggleChecked={onToggleChecked}
          prescribedSupplements={prescribedSupplements}
        />
      </div>
    )
  }

  return (
    <div style={{ marginTop: 14 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', minHeight: 48, borderRadius: 14,
          background: 'white', border: '1.5px solid var(--border)',
          cursor: 'pointer', fontFamily: "var(--font-ui)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--coral)' }}>
          Supplements · {done} of {total}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-light)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <SupplementChecklist
            checkedSupplements={checkedSupplements}
            onToggleChecked={onToggleChecked}
            prescribedSupplements={prescribedSupplements}
          />
        </div>
      )}
    </div>
  )
}

// ─── Progress ring ────────────────────────────────────────────────────────────

function ProgressRing({ value, target, color, darkColor, label }) {
  const size = 80
  const strokeWidth = 7
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / Math.max(target, 1), 1)
  const offset = circumference * (1 - pct)
  const met = value >= target

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={met ? darkColor : color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
          color: met ? darkColor : 'var(--text-mid)',
        }}>
          {value}g
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 500 }}>{label}</div>
        {met && <div style={{ fontSize: 13, color: darkColor, fontWeight: 700, marginTop: 1 }}>✓</div>}
      </div>
    </div>
  )
}

// ─── Parent note section ──────────────────────────────────────────────────────

export function ParentNoteSection({ note, selectedDate, onSave, onDelete }) {
  const [body, setBody] = useState(note?.body || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setBody(note?.body || '')
    setSaveStatus('idle')
    setConfirmDelete(false)
  }, [selectedDate])

  const isDirty = body.trim() !== (note?.body?.trim() || '')
  const isRead = !!note?.read_at

  async function handleSave() {
    if (!isDirty || isSaving) return
    setIsSaving(true)
    setSaveStatus('idle')
    try {
      await onSave(body.trim())
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  function handleDelete() {
    onDelete?.(note.id)
    setBody('')
    setSaveStatus('idle')
    setConfirmDelete(false)
  }

  return (
    <div style={{ marginTop: 24, position: 'relative', paddingTop: 14 }}>
      {/* Tape label */}
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%) rotate(-1deg)',
        background: 'var(--border)', borderRadius: 4,
        width: 64, height: 14,
        zIndex: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
      }} />

      {/* Notebook card */}
      <div style={{
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(29,33,43,0.06)',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 20px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--coral)', fontFamily: "'Lato', sans-serif" }}>
            Parent Note
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isRead && (
              <span style={{ fontSize: 13, color: 'var(--mint)', fontWeight: 500 }}>✓ Clinician read</span>
            )}
            {onDelete && note?.id && (
              confirmDelete ? (
                <span style={{ fontSize: 13, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                  Delete this note?{' '}
                  <button
                    onClick={handleDelete}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pink)', fontWeight: 700, fontSize: 13, padding: 0, fontFamily: 'inherit' }}
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
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 13, padding: 0, fontFamily: 'inherit' }}
                >Delete note</button>
              )
            )}
          </div>
        </div>

        {/* Ruled writing area */}
        <div style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, var(--border) 27px, var(--border) 28px)',
          backgroundSize: '100% 28px', backgroundPositionY: '4px',
          display: 'flex',
        }}>
          <div style={{ width: 2, background: 'var(--pink-mid)', flexShrink: 0, marginLeft: 20, marginRight: 12 }} />
          <div style={{ flex: 1, padding: '10px 16px 10px 0' }}>
            <textarea
              value={body}
              onChange={e => { setBody(e.target.value); setSaveStatus('idle') }}
              placeholder="Write a note for your care team..."
              rows={4}
              maxLength={1000}
              style={{
                width: '100%', border: 'none', background: 'transparent',
                resize: 'none', outline: 'none',
                fontSize: 13, fontFamily: "'Lato', sans-serif",
                color: 'var(--text-dark)', lineHeight: '28px',
                padding: 0, boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 12px',
          borderTop: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-light)' }}>{body.length} / 1000</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveStatus === 'saved' && !isDirty && (
              <span style={{ fontSize: 13, color: 'var(--mint)', fontWeight: 500 }}>✓ Saved</span>
            )}
            {saveStatus === 'error' && (
              <span style={{ fontSize: 13, color: 'var(--pink)', fontWeight: 500 }}>Failed to save</span>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              style={{
                background: !isDirty || isSaving ? 'rgba(35,64,142,0.15)' : 'var(--ink)',
                color: !isDirty || isSaving ? 'var(--text-light)' : 'white',
                border: 'none', borderRadius: 20, padding: '6px 18px',
                fontSize: 12, fontWeight: 600,
                cursor: (!isDirty || isSaving) ? 'default' : 'pointer',
                fontFamily: "'Lato', sans-serif", transition: 'all 0.15s',
                boxShadow: !isDirty || isSaving ? 'none' : '0 2px 8px rgba(35,64,142,0.28)',
              }}
            >
              {isSaving ? 'Saving…' : note?.id ? 'Update note' : 'Save note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Daily progress panel ─────────────────────────────────────────────────────

function DailyProgressPanel({ mealItems }) {
  const { targets } = useNutritionalTargets()

  const totals = useMemo(() => {
    const all = Object.values(mealItems).flat()
    const sums = { protein: 0, carbs: 0, fruitsVeggies: 0 }
    for (const food of all) {
      const info = lookupNutrition(food)
      for (const n of RING_NUTRIENTS) sums[n.key] += n.getVal(info)
    }
    return {
      protein:       Math.round(sums.protein),
      carbs:         Math.round(sums.carbs),
      fruitsVeggies: Math.round(sums.fruitsVeggies),
    }
  }, [mealItems])

  const metCount = RING_NUTRIENTS.filter(n => totals[n.key] >= targets[n.key]).length

  return (
    <div style={{
      marginTop: 24,
      background: 'white', borderRadius: 16,
      border: '1.5px solid var(--border)',
      boxShadow: '0 2px 12px rgba(29,33,43,0.06)',
      padding: '20px 24px',
    }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>Daily Progress</div>
        <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>
          {metCount} of 3 goals met
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 40 }}>
        {RING_NUTRIENTS.map(n => (
          <ProgressRing
            key={n.key}
            value={totals[n.key]}
            target={targets[n.key]}
            color={n.color}
            darkColor={n.darkColor}
            label={n.label}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Clinician notes sidebar ──────────────────────────────────────────────────

export function ClinicianNotesSidebar({
  clinicianNotes, clinicianNotesRead, markClinicianNoteRead, savedClinicianNotes, saveClinicianNote, unsaveClinicianNote, clearAllSavedNotes,
  hiddenNoteIds = [], onHideNote, onUnhideNote,
}) {
  const [showSaved, setShowSaved] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [expandedNoteId, setExpandedNoteId] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmHideLatest, setConfirmHideLatest] = useState(false)

  useEffect(() => {
    if (savedClinicianNotes.length === 0) { setShowSaved(false); setConfirmClear(false) }
  }, [savedClinicianNotes.length])

  const today = localIsoDate()
  // Hidden notes never surface as "latest" — otherwise dismissing the
  // featured note would leave it right back on screen.
  const visibleNotes = clinicianNotes.filter(n => !hiddenNoteIds.includes(n.id))
  const todayNote = visibleNotes.find(n => n.created_at && localIsoDate(new Date(n.created_at)) === today)
  const latest = todayNote || visibleNotes[0] || null

  useEffect(() => { setConfirmHideLatest(false) }, [latest?.id])

  const noteDate = latest?.created_at?.slice(0, 10)
  const directRead = latest ? clinicianNotesRead[latest.id] : null
  const dateKeyRead = noteDate ? clinicianNotesRead['date:' + noteDate] : null
  const readBodyMatches = !!directRead && directRead.noteBody !== undefined && directRead.noteBody === latest?.body
  const isRead = readBodyMatches
  const isUpdated = (!!directRead && !readBodyMatches) || (!directRead && !!dateKeyRead)
  const isSaved = latest ? savedClinicianNotes.some(n => n.id === latest.id) : false

  const olderNotes = clinicianNotes.filter(n => n.id !== latest?.id)
  // Derived once so the "Removed (N)" count and the list it expands to can
  // never drift apart (e.g. if a hidden id no longer matches a real note).
  const removedNotes = clinicianNotes.filter(n => hiddenNoteIds.includes(n.id))

  return (
    <div style={{ marginBottom: 22, position: 'relative', paddingTop: 14 }}>
      {/* Tape */}
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%) rotate(-1deg)',
        background: 'var(--border)', borderRadius: 4,
        width: 64, height: 14,
        zIndex: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
      }} />

      <div style={{
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(29,33,43,0.06)',
      }}>
        <div style={{ padding: '10px 12px 6px' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--coral)', fontFamily: "'Lato', sans-serif" }}>
            Clinician Notes
          </span>
        </div>

        {/* Ruled area */}
        <div style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, var(--border) 27px, var(--border) 28px)',
          backgroundSize: '100% 28px', backgroundPositionY: '4px',
          display: 'flex', minHeight: 84,
        }}>
          <div style={{ width: 2, background: 'var(--pink-mid)', flexShrink: 0, marginLeft: 10, marginRight: 8 }} />
          <div style={{ flex: 1, padding: '8px 10px 8px 0' }}>
            {!latest ? (
              <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                <span style={{ color: 'rgba(35,64,142,0.3)', fontSize: 14, lineHeight: '28px' }}>○</span>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic', lineHeight: '28px' }}>No notes yet.</p>
              </div>
            ) : (
              <>
                {isUpdated && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--st-some)', flexShrink: 0, display: 'block' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--st-some)' }}>Updated</span>
                  </div>
                )}
                {!isRead && !isUpdated && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--st-some)', flexShrink: 0, display: 'block' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--st-some)' }}>Unread</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--coral)', fontSize: 14, lineHeight: '28px', flexShrink: 0 }}>○</span>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-mid)', lineHeight: '28px' }}>{latest.body}</p>
                </div>
                {latest.created_at && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-light)' }}>
                    {new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action row */}
        {latest && (
          <div style={{
            padding: '7px 10px', borderTop: '1px solid var(--border)',
            display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
          }}>
            {isRead && !isUpdated ? (
              <span style={{ fontSize: 12, color: 'var(--mint)', fontWeight: 500 }}>✓ Read</span>
            ) : (
              <button
                onClick={() => markClinicianNoteRead?.(latest)}
                style={{
                  background: 'none', border: '1px solid var(--border-mid)',
                  borderRadius: 20, padding: '3px 9px', fontSize: 12, fontWeight: 600,
                  color: isUpdated ? 'var(--st-some)' : 'var(--coral)', cursor: 'pointer',
                  fontFamily: "'Lato', sans-serif",
                  borderColor: isUpdated ? 'var(--st-some)' : 'var(--border-mid)',
                }}
              >Mark as read</button>
            )}
            <button
              onClick={() => isSaved ? unsaveClinicianNote?.(latest.id) : saveClinicianNote?.(latest)}
              style={{
                background: isSaved ? 'var(--peach-light)' : 'none',
                border: `1px solid ${isSaved ? 'var(--peach-mid)' : 'var(--border-mid)'}`,
                borderRadius: 20, padding: '3px 9px', fontSize: 12, fontWeight: 600,
                color: isSaved ? 'var(--peach)' : 'var(--text-light)', cursor: 'pointer',
                fontFamily: "'Lato', sans-serif",
              }}
            >{isSaved ? 'Saved' : 'Save'}</button>
            {onHideNote && (
              confirmHideLatest ? (
                <span style={{ fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                  Hide?{' '}
                  <button
                    onClick={() => { onHideNote(latest.id); setConfirmHideLatest(false) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pink)', fontWeight: 700, fontSize: 12, padding: 0, fontFamily: 'inherit' }}
                  >Yes</button>
                  {' / '}
                  <button
                    onClick={() => setConfirmHideLatest(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 12, padding: 0, fontFamily: 'inherit' }}
                  >Cancel</button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmHideLatest(true)}
                  title="Remove from this list"
                  style={{
                    background: 'none', border: '1px solid var(--border-mid)',
                    borderRadius: 20, padding: '3px 9px', fontSize: 12, fontWeight: 600,
                    color: 'var(--text-light)', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                  }}
                >Hide</button>
              )
            )}
          </div>
        )}

        {/* Saved Notes section */}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => savedClinicianNotes.length > 0 && setShowSaved(s => !s)}
            style={{
              width: '100%', padding: '7px 12px', background: 'none', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: savedClinicianNotes.length > 0 ? 'pointer' : 'default',
              fontFamily: "'Lato', sans-serif",
              opacity: savedClinicianNotes.length > 0 ? 1 : 0.4,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--peach)' }}>{savedClinicianNotes.length} saved</span>
            {savedClinicianNotes.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{showSaved ? '▲' : '▼'}</span>
            )}
          </button>
          {showSaved && savedClinicianNotes.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {[...savedClinicianNotes].reverse().map((note, i) => (
                <div key={`${note.id}-${i}`} style={{
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, var(--border) 27px, var(--border) 28px)',
                  backgroundSize: '100% 28px', backgroundPositionY: '4px',
                  display: 'flex', borderBottom: '1px solid var(--border)',
                  position: 'relative',
                }}>
                  <div style={{ width: 2, background: 'var(--pink-mid)', flexShrink: 0, marginLeft: 8, marginRight: 6 }} />
                  <div style={{ flex: 1, padding: '7px 28px 7px 0' }}>
                    <p style={{ margin: '0 0 3px', fontSize: 13, color: 'var(--text-mid)', lineHeight: '28px' }}>{note.body}</p>
                    <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <button
                    onClick={() => unsaveClinicianNote?.(note.id)}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--pink)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-light)' }}
                    style={{
                      position: 'absolute', top: 6, right: 8,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-light)', fontSize: 14, lineHeight: 1, padding: 0,
                      fontFamily: 'inherit', transition: 'color 0.15s',
                    }}
                  >×</button>
                </div>
              ))}
              {/* Clear all */}
              <div style={{ padding: '7px 12px', display: 'flex', justifyContent: 'flex-end' }}>
                {confirmClear ? (
                  <span style={{ fontSize: 12, color: 'var(--text-mid)', fontFamily: "'Lato', sans-serif" }}>
                    Sure?{' '}
                    <button
                      onClick={() => { clearAllSavedNotes?.(); setShowSaved(false); setConfirmClear(false) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pink)', fontSize: 12, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}
                    >Yes</button>
                    {' / '}
                    <button
                      onClick={() => setConfirmClear(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 12, padding: 0, fontFamily: 'inherit' }}
                    >Cancel</button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--pink)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-light)' }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, color: 'var(--text-light)', padding: 0,
                      fontFamily: "'Lato', sans-serif", transition: 'color 0.15s',
                    }}
                  >Clear all saved</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* All Notes section */}
        {olderNotes.filter(n => !hiddenNoteIds.includes(n.id)).length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => setShowAll(s => !s)}
              style={{
                width: '100%', padding: '7px 12px', background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', fontFamily: "'Lato', sans-serif",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>History ({olderNotes.filter(n => !hiddenNoteIds.includes(n.id)).length})</span>
              <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{showAll ? '▲' : '▼'}</span>
            </button>
            {showAll && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {olderNotes.filter(n => !hiddenNoteIds.includes(n.id)).map((note, i) => {
                  const isExpanded = expandedNoteId === note.id
                  const preview = note.body?.length > 50 ? note.body.slice(0, 50) + '…' : note.body
                  return (
                    <div
                      key={`${note.id}-${i}`}
                      onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                      style={{
                        position: 'relative', padding: '8px 28px 8px 12px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer', background: isExpanded ? 'var(--surface-warm)' : 'white',
                      }}
                    >
                      <button
                        onClick={e => { e.stopPropagation(); onHideNote?.(note.id) }}
                        title="Remove from this list"
                        aria-label="Remove from this list"
                        style={{
                          position: 'absolute', top: 6, right: 8,
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-light)', fontSize: 14, lineHeight: 1, padding: 0,
                          fontFamily: 'inherit',
                        }}
                      >×</button>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 3 }}>
                        {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5 }}>
                        {isExpanded ? note.body : preview}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Removed notes — reversible, so nothing is ever truly lost from this view */}
        {removedNotes.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => setShowHidden(s => !s)}
              style={{
                width: '100%', padding: '7px 12px', background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', fontFamily: "'Lato', sans-serif",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-light)' }}>Removed ({removedNotes.length})</span>
              <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{showHidden ? '▲' : '▼'}</span>
            </button>
            {showHidden && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {removedNotes.map(note => (
                  <div key={note.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    padding: '8px 12px', borderBottom: '1px solid var(--border)',
                  }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-light)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {note.body}
                    </p>
                    <button
                      onClick={() => onUnhideNote?.(note.id)}
                      style={{
                        flexShrink: 0, background: 'none', border: '1px solid var(--border-mid)',
                        borderRadius: 20, padding: '3px 9px', fontSize: 12, fontWeight: 600,
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
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function DailyView() {
  const { clinicianNotes = [], parentNotes = [], clinicianNotesRead = {}, mealStatuses = {}, savedClinicianNotes = [], weekOffset = 0, setWeekOffset, saveParentNote, deleteParentNote, markClinicianNoteRead, saveClinicianNote, unsaveClinicianNote, clearAllSavedNotes, setMealStatus } = useOutletContext()
  const [selectedDay, setSelectedDay] = useState(getTodayKey)
  const [activeDrag, setActiveDrag] = useState(null)
  const [selectedFood, setSelectedFood] = useState(null)
  const [expandedMeal, setExpandedMeal] = useState(null)
  const [addFoodSheetMeal, setAddFoodSheetMeal] = useState(null)
  const [quickLogMealKey, setQuickLogMealKey] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpNote, setHelpNote] = useState('')
  const [dismissedSupport, setDismissedSupport] = useState(() => new Set())
  const isMobile = useIsMobile()

  function openHelp(note) {
    setHelpNote(note)
    setHelpOpen(true)
  }

  function dismissSupport(key) {
    setDismissedSupport(prev => new Set(prev).add(key))
  }

  function goToToday() {
    setWeekOffset(0)
    setSelectedDay(getTodayKey())
  }
  const { hideNutritionNumbers } = useAppMode()

  const {
    quickLogMeal,
    supplementLog, toggleSupplement,
    allMealItems, setMealItems,
    mealTimesByDate, updateMealTime,
    prescribedSupplements,
    mealDistress, setMealDistress,
    hiddenClinicianNoteIds, hideClinicianNote, unhideClinicianNote,
  } = useFirebaseData()

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const checkedSupplements = useMemo(() => new Set(supplementLog[weekDates[selectedDay]] || []), [supplementLog, weekDates, selectedDay])

  function handleToggleSupplement(nutrient) {
    toggleSupplement(weekDates[selectedDay], nutrient)
  }

  const selectedDate = weekDates[selectedDay]
  const mealTimes = { ...DEFAULT_MEAL_TIMES, ...(mealTimesByDate[selectedDate] || {}) }
  const mealItems = { ...EMPTY_MEAL_ITEMS, ...(allMealItems[selectedDate] || {}) }

  useEffect(() => {
    if (!selectedFood) return
    function handleClick() { setSelectedFood(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [selectedFood])

  function setFoodStatus(mealType, index, status) {
    setMealItemsForDay(prev => {
      const updated = [...prev[mealType]]
      updated[index] = { ...updated[index], status }
      return { ...prev, [mealType]: updated }
    })
    setSelectedFood(null)
  }

  // How much of the food was eaten (0.25–1, or null to clear). Leaves the food
  // selected so the parent can set portion and status in one go.
  function setFoodPortion(mealType, index, portion) {
    setMealItemsForDay(prev => {
      const updated = [...prev[mealType]]
      updated[index] = { ...updated[index], portion }
      return { ...prev, [mealType]: updated }
    })
  }

  function setMealItemsForDay(updater) {
    const current = { ...EMPTY_MEAL_ITEMS, ...(allMealItems[selectedDate] || {}) }
    const next = updater(current)
    for (const mealType of Object.keys(next)) {
      if (next[mealType] !== current[mealType]) {
        setMealItems(selectedDate, mealType, next[mealType])
      }
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function addFoodToMeal(mealType, food) {
    setMealItemsForDay(prev => ({ ...prev, [mealType]: [...prev[mealType], food] }))
    if (mealStatuses[selectedDate]?.[mealType] === 'skipped') {
      setMealStatus(selectedDate, mealType, null)
    }
  }

  // Add several foods in one write (each addFoodToMeal call would start from the
  // same snapshot and overwrite the one before it). Skips foods already in the meal.
  function addFoodsToMeal(mealType, foods) {
    setMealItemsForDay(prev => {
      const have = new Set(prev[mealType].map(f => f.id || f.name))
      const fresh = foods.filter(f => !have.has(f.id || f.name))
      return fresh.length ? { ...prev, [mealType]: [...prev[mealType], ...fresh] } : prev
    })
    if (mealStatuses[selectedDate]?.[mealType] === 'skipped') {
      setMealStatus(selectedDate, mealType, null)
    }
  }

  function removeFoodFromMeal(mealType, food) {
    const current = { ...EMPTY_MEAL_ITEMS, ...(allMealItems[selectedDate] || {}) }
    const idx = (current[mealType] || []).findIndex(f => f.id === food.id)
    if (idx !== -1) removeItem(mealType, idx)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveDrag(null)
    if (!over) return
    const food = active.data.current?.food
    const mealType = over.data.current?.mealType
    if (!food || !mealType) return
    addFoodToMeal(mealType, food)
  }

  function stepDay(direction) {
    const idx = DAYS.findIndex(d => d.key === selectedDay)
    let nextIdx = idx + direction
    if (nextIdx < 0) {
      setWeekOffset(o => o - 1)
      nextIdx = DAYS.length - 1
    } else if (nextIdx >= DAYS.length) {
      setWeekOffset(o => o + 1)
      nextIdx = 0
    }
    setSelectedDay(DAYS[nextIdx].key)
  }

  function removeItem(mealType, index) {
    const current = { ...EMPTY_MEAL_ITEMS, ...(allMealItems[selectedDate] || {}) }
    const next = current[mealType].filter((_, i) => i !== index)
    setMealItemsForDay(prev => ({ ...prev, [mealType]: next }))
    if (next.length === 0) {
      setMealStatus(selectedDate, mealType, null)
    }
  }

  function handleQuickLog(mealType, status) {
    setMealStatus(selectedDate, mealType, status)
  }

  if (isMobile) {
    const dateObj = new Date(selectedDate + 'T12:00:00')
    const isToday = selectedDate === TODAY_ISO
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
    const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

    return (
      <>
        <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', padding: '4px 0 32px' }}>
          <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '12px 16px 4px' }}>
            <div style={{ minWidth: 0 }}>
              <h1 className="font-hand" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.1 }}>{isToday ? 'Today' : dayName}</h1>
              <p style={{ fontSize: 15, color: 'var(--text-mid)', marginTop: 4 }}>{isToday ? `${dayName}, ${dateLabel}` : dateLabel}</p>
            </div>
            <NeedHelpButton onClick={() => openHelp('')} />
          </header>

          <nav aria-label="Change day" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px 10px' }}>
            <DayStepButton dir={-1} onClick={() => stepDay(-1)} />
            <DayStepButton dir={1} onClick={() => stepDay(1)} />
            {!isToday && (
              <button onClick={goToToday} style={{
                minHeight: 44, padding: '6px 12px', border: 'none', background: 'none', color: 'var(--ink)',
                fontSize: 15, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
              }}>Back to today</button>
            )}
          </nav>

          <section aria-label="Meals" style={{
            background: 'white', borderTop: '1px solid var(--rule-strong)', borderBottom: '1px solid var(--rule-strong)',
            backgroundImage: `linear-gradient(to right, transparent ${MARGIN - 1}px, var(--margin) ${MARGIN - 1}px, var(--margin) ${MARGIN}px, transparent ${MARGIN}px)`,
          }}>
            {MEALS.map(meal => {
              const localStatus = (mealStatuses[selectedDate] || {})[meal.key] ?? null
              const latestLog = localStatus ? { status: localStatus } : null
              const distress = mealDistress?.[selectedDate]?.[meal.key] || null
              const supportKey = `${selectedDate}-${meal.key}`
              const showSupport = !dismissedSupport.has(supportKey) && needsSupport({ status: localStatus, distress })
              return (
                <Fragment key={meal.key}>
                  <MobileMealCard
                    meal={meal}
                    items={mealItems[meal.key]}
                    latestLog={latestLog}
                    onQuickLog={status => handleQuickLog(meal.key, status)}
                    time={mealTimes[meal.key]}
                    onTimeChange={(mealType, value) => updateMealTime(selectedDate, mealType, value)}
                    distress={distress}
                    onDistressSet={patch => setMealDistress(selectedDate, meal.key, patch)}
                    expanded={expandedMeal === meal.key}
                    onToggleExpand={() => setExpandedMeal(prev => prev === meal.key ? null : meal.key)}
                    onOpenAddFood={() => setAddFoodSheetMeal(meal.key)}
                    onRemove={index => removeItem(meal.key, index)}
                    selectedFoodIndex={selectedFood?.mealType === meal.key ? selectedFood.index : null}
                    onFoodClick={index => setSelectedFood(
                      selectedFood?.mealType === meal.key && selectedFood?.index === index
                        ? null
                        : { mealType: meal.key, index }
                    )}
                    onFoodStatusSet={setFoodStatus}
                    onFoodPortionSet={setFoodPortion}
                    onOpenLog={() => setQuickLogMealKey(meal.key)}
                    yesterdayItems={sameAsYesterday(allMealItems, selectedDate, meal.key)}
                    recentList={recentFoods(allMealItems, { date: selectedDate, mealType: meal.key, exclude: mealItems[meal.key] })}
                    onAddItems={foods => addFoodsToMeal(meal.key, foods)}
                  />
                  {showSupport && (
                    <div style={{ padding: `8px 10px 12px ${MARGIN + 8}px`, borderBottom: '1px solid var(--rule)' }}>
                      <HardMomentCard
                        onMessage={() => openHelp(hardMealNote({ mealLabel: meal.label, dateLabel: shortDate(selectedDate), outcomeLabel: outcomeLabel(localStatus) }))}
                        onHelp={() => openHelp('')}
                        onDismiss={() => dismissSupport(supportKey)}
                      />
                    </div>
                  )}
                </Fragment>
              )
            })}
          </section>

          <div style={{ padding: '0 16px' }}>
            <MobileSupplements
              checkedSupplements={checkedSupplements}
              onToggleChecked={handleToggleSupplement}
              prescribedSupplements={prescribedSupplements}
            />

            {!hideNutritionNumbers && <DailyProgressPanel mealItems={mealItems} />}

            <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55, marginTop: 28, maxWidth: '60ch' }}>
              Plate Together helps families and their care team plan meals. It is not a substitute for medical advice.
            </p>
          </div>
        </div>

        <AddFoodSheet
          open={addFoodSheetMeal != null}
          onClose={() => setAddFoodSheetMeal(null)}
          mealLabel={MEALS.find(m => m.key === addFoodSheetMeal)?.label || ''}
          mealItems={mealItems[addFoodSheetMeal] || []}
          onAddToMeal={food => addFoodToMeal(addFoodSheetMeal, food)}
          onRemoveFromMeal={food => removeFoodFromMeal(addFoodSheetMeal, food)}
        />

        <QuickLogSheet
          open={quickLogMealKey != null}
          meal={MEALS.find(m => m.key === quickLogMealKey) || null}
          status={quickLogMealKey ? mealStatuses[selectedDate]?.[quickLogMealKey] ?? null : null}
          difficulty={quickLogMealKey ? mealDistress?.[selectedDate]?.[quickLogMealKey]?.post ?? null : null}
          onOutcome={outcome => quickLogMeal(selectedDate, quickLogMealKey, { outcome })}
          onDifficulty={difficulty => {
            quickLogMeal(selectedDate, quickLogMealKey, { difficulty })
            setQuickLogMealKey(null)
          }}
          onClose={() => setQuickLogMealKey(null)}
        />

        <HelpSheet key={helpNote} open={helpOpen} defaultNote={helpNote} onClose={() => setHelpOpen(false)} />
      </>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={e => { const f = e.active.data.current?.food; if (f) setActiveDrag(f) }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', maxWidth: 1280, margin: '0 auto', width: '100%' }}>

        {/* Left sidebar */}
        <aside style={{
          width: 272, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          overflowY: 'auto', background: 'white',
        }}>
          <FoodSidebar />
        </aside>

        {/* Center */}
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>

          {/* Day heading and day selector */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
            <div>
              <h1 className="font-hand" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>
                {selectedDate === TODAY_ISO ? 'Today' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
              </h1>
              <p style={{ fontSize: 15, color: 'var(--text-mid)', marginTop: 4 }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <NeedHelpButton onClick={() => openHelp('')} />
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <button onClick={() => setWeekOffset(o => o - 1)} aria-label="Previous week" style={weekNavBtn}><Icon name="left" size={18} /></button>
              <span style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>
                {weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : weekOffset === 1 ? 'Next week' : `${shortDate(weekDates.mon)} – ${shortDate(weekDates.sun)}`}
              </span>
              <button onClick={() => setWeekOffset(o => o + 1)} aria-label="Next week" style={weekNavBtn}><Icon name="right" size={18} /></button>
              {weekOffset !== 0 && (
                <button onClick={goToToday} style={{ border: 'none', background: 'none', color: 'var(--ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>Back to today</button>
              )}
            </div>
            <div role="tablist" aria-label="Day" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid var(--rule-strong)', borderBottom: '1px solid var(--rule-strong)', background: 'white' }}>
              {DAYS.map(day => {
                const dateIso = weekDates[day.key]
                const isToday = dateIso === TODAY_ISO
                const isSelected = day.key === selectedDay
                const dateObj = new Date(dateIso + 'T12:00:00')
                return (
                  <button
                    key={day.key}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedDay(day.key)}
                    style={{
                      padding: '8px 4px', minHeight: 52, border: 'none', cursor: 'pointer',
                      borderBottom: isSelected ? '3px solid var(--ink)' : '3px solid transparent',
                      background: isSelected ? 'var(--ink-light)' : 'transparent',
                      color: isSelected ? 'var(--ink)' : 'var(--text-dark)',
                      fontWeight: isSelected || isToday ? 700 : 500, fontSize: 14,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}
                  >
                    <span>{day.label}{isToday ? ' (today)' : ''}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 400 }}>{dateObj.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Meal cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MEALS.map(meal => {
              const localStatus = (mealStatuses[selectedDate] || {})[meal.key] ?? null
              const latestLog = localStatus ? { status: localStatus } : null
              const distress = mealDistress?.[selectedDate]?.[meal.key] || null
              const supportKey = `${selectedDate}-${meal.key}`
              const showSupport = !dismissedSupport.has(supportKey) && needsSupport({ status: localStatus, distress })
              return (
                <Fragment key={meal.key}>
                  <MealCard
                    meal={meal}
                    items={mealItems[meal.key]}
                    onRemove={index => removeItem(meal.key, index)}
                    latestLog={latestLog}
                    onQuickLog={status => handleQuickLog(meal.key, status)}
                    time={mealTimes[meal.key]}
                    onTimeChange={(mealType, value) => updateMealTime(selectedDate, mealType, value)}
                    distress={distress}
                    onDistressSet={patch => setMealDistress(selectedDate, meal.key, patch)}
                    selectedFoodIndex={selectedFood?.mealType === meal.key ? selectedFood.index : null}
                    onFoodClick={index => setSelectedFood(
                      selectedFood?.mealType === meal.key && selectedFood?.index === index
                        ? null
                        : { mealType: meal.key, index }
                    )}
                    onFoodStatusSet={setFoodStatus}
                    onFoodPortionSet={setFoodPortion}
                  />
                  {showSupport && (
                    <HardMomentCard
                      onMessage={() => openHelp(hardMealNote({ mealLabel: meal.label, dateLabel: shortDate(selectedDate), outcomeLabel: outcomeLabel(localStatus) }))}
                      onHelp={() => openHelp('')}
                      onDismiss={() => dismissSupport(supportKey)}
                    />
                  )}
                </Fragment>
              )
            })}
          </div>

          {/* Daily progress rings */}
          {!hideNutritionNumbers && <DailyProgressPanel mealItems={mealItems} />}
          {/* Parent note for this day */}
          <ParentNoteSection
            note={parentNotes.find(n => n.date === selectedDate) || null}
            selectedDate={selectedDate}
            onSave={body => {
              const existing = parentNotes.find(n => n.date === selectedDate)
              return saveParentNote({ date: selectedDate, body, existingNoteId: existing?.id || null })
            }}
            onDelete={deleteParentNote}
          />

          <p style={{
            fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55, maxWidth: '60ch',
            borderTop: '1px solid var(--rule)', paddingTop: 18, marginTop: 28,
          }}>
            Plate Together helps families and their care team plan meals. It is not a substitute for medical advice.
          </p>
        </main>

        {/* Right sidebar */}
        <aside style={{
          width: 214, flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          padding: '24px 18px', overflowY: 'auto', background: 'white',
        }}>
          <ClinicianNotesSidebar
            clinicianNotes={clinicianNotes}
            clinicianNotesRead={clinicianNotesRead}
            markClinicianNoteRead={markClinicianNoteRead}
            savedClinicianNotes={savedClinicianNotes}
            saveClinicianNote={saveClinicianNote}
            unsaveClinicianNote={unsaveClinicianNote}
            clearAllSavedNotes={clearAllSavedNotes}
            hiddenNoteIds={hiddenClinicianNoteIds}
            onHideNote={hideClinicianNote}
            onUnhideNote={unhideClinicianNote}
          />

          <div style={{ marginTop: 22 }}>
            <SupplementChecklist
              checkedSupplements={checkedSupplements}
              onToggleChecked={handleToggleSupplement}
              prescribedSupplements={prescribedSupplements}
            />
          </div>
        </aside>
      </div>

      <HelpSheet key={helpNote} open={helpOpen} defaultNote={helpNote} onClose={() => setHelpOpen(false)} />

      <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {activeDrag ? <FoodCardPreview name={activeDrag.name} category={activeDrag.category} floating /> : null}
      </DragOverlay>
    </DndContext>
  )
}

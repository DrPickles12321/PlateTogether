import { useState } from 'react'
import NutritionBadge from './NutritionBadge'
import Icon, { OutcomeMark } from './Icon'
import { localIsoDate } from '../lib/constants'
import { OUTCOME_META, needsSupport } from '../lib/outcomes'

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'snack',     label: 'Snack' },
  { key: 'dinner',    label: 'Dinner' },
]

const PORTION_FRACTION = { 0.25: '¼', 0.5: '½', 0.75: '¾', 1: 'all' }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const TODAY_ISO = localIsoDate()
const COLS = '108px repeat(7, minmax(0, 1fr))'

function getWeekDates(offset = 0) {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function distressText(distress) {
  if (!distress) return null
  const parts = []
  if (distress.pre) parts.push(`before ${distress.pre}`)
  if (distress.post) parts.push(`after ${distress.post}`)
  return parts.length ? `Distress ${parts.join(', ')}` : null
}

// One cell of the family's file. The outcome is always shown when one was logged, even with no
// foods, and a refusal or distress of 4-5 is highlighted so the clinician sees it first.
function ClinicianMealSlot({ items = [], status, distress, isFuture }) {
  const outcome = OUTCOME_META[status]
  const flagged = needsSupport({ status, distress })
  const dText = distressText(distress)
  const empty = !outcome && items.length === 0

  return (
    <div style={{
      minHeight: 84, padding: 8, borderRadius: 'var(--radius)', boxSizing: 'border-box',
      background: flagged ? 'var(--highlight)' : 'white',
      border: empty ? '1px dashed var(--border-mid)' : `1px solid ${flagged ? '#E6CF52' : 'var(--rule-strong)'}`,
      fontSize: 13, color: 'var(--text-dark)',
    }}>
      {outcome && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: outcome.color, marginBottom: 4 }}>
          <OutcomeMark mark={outcome.mark} size={14} color={outcome.color} />
          {outcome.label}
        </div>
      )}
      {items.map((food, i) => (
        <div key={i} style={{ lineHeight: 1.35, overflowWrap: 'anywhere' }}>
          {food.name}
          {food.portion != null && food.portion < 1 && (
            <span style={{ marginLeft: 4, fontWeight: 700, color: 'var(--st-some)' }}>{PORTION_FRACTION[food.portion]}</span>
          )}
          <NutritionBadge foodName={food.name} food={food} mode="clinician" />
        </div>
      ))}
      {dText && (
        <div style={{ marginTop: 4, fontSize: 12, fontWeight: flagged ? 700 : 500, color: flagged ? 'var(--highlight-ink)' : 'var(--text-mid)' }}>{dText}</div>
      )}
      {empty && (
        <div style={{ color: 'var(--text-mid)', fontSize: 12, paddingTop: 22, textAlign: 'center' }}>
          {isFuture ? '' : 'Not logged'}
        </div>
      )}
    </div>
  )
}

export default function WeeklyGrid({ onDayClick, parentNotes = [], onMarkNoteRead, parentMealItems = {}, mealStatuses = {}, mealDistress = {} }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekDates = getWeekDates(weekOffset)

  const weekLabel = weekOffset === 0 ? 'This week'
    : weekOffset === -1 ? 'Last week'
    : weekOffset === 1 ? 'Next week'
    : `${MONTHS[weekDates[0].getMonth()]} ${weekDates[0].getDate()} – ${MONTHS[weekDates[6].getMonth()]} ${weekDates[6].getDate()}`

  const navBtn = {
    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 'var(--radius)', border: '1px solid var(--border-mid)', background: 'white',
    color: 'var(--text-dark)', cursor: 'pointer',
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={() => setWeekOffset(o => o - 1)} aria-label="Previous week" style={navBtn}><Icon name="left" /></button>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', minWidth: 96, textAlign: 'center' }}>{weekLabel}</span>
        <button onClick={() => setWeekOffset(o => o + 1)} aria-label="Next week" style={navBtn}><Icon name="right" /></button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} style={{ border: 'none', background: 'none', color: 'var(--ink)', fontSize: 14, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', minHeight: 44 }}>
            This week
          </button>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-mid)' }}>
          <span style={{ width: 14, height: 14, background: 'var(--highlight)', border: '1px solid #E6CF52', borderRadius: 3 }} />
          Highlighted: refused, or distress 4 or 5
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div role="table" aria-label="Meals this week" style={{ minWidth: 760 }}>
          <div role="row" style={{ display: 'grid', gridTemplateColumns: COLS, gap: 6, marginBottom: 6, position: 'sticky', top: 0, background: 'var(--surface-warm)', zIndex: 1 }}>
            <div role="columnheader" />
            {DAYS.map((day, i) => {
              const d = weekDates[i]
              const dateIso = localIsoDate(d)
              const isToday = dateIso === TODAY_ISO
              const content = (
                <>
                  <span style={{ display: 'block', fontWeight: 700 }}>{day.label}{isToday ? ' (today)' : ''}</span>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)' }}>{MONTHS[d.getMonth()]} {d.getDate()}</span>
                </>
              )
              return (
                <div role="columnheader" key={day.key} style={{ textAlign: 'center' }}>
                  {onDayClick ? (
                    <button
                      onClick={() => onDayClick(day.key, dateIso)}
                      aria-label={`${day.label} ${MONTHS[d.getMonth()]} ${d.getDate()}: open nutrition summary`}
                      style={{
                        width: '100%', minHeight: 52, padding: '6px 2px', borderRadius: 'var(--radius)', cursor: 'pointer',
                        border: isToday ? '1.5px solid var(--ink)' : '1px solid transparent',
                        background: isToday ? 'var(--ink-light)' : 'transparent', color: isToday ? 'var(--ink)' : 'var(--text-dark)',
                        fontSize: 14,
                      }}
                    >{content}</button>
                  ) : <div style={{ padding: '6px 2px', fontSize: 14 }}>{content}</div>}
                </div>
              )
            })}
          </div>

          {MEAL_TYPES.map(meal => (
            <div role="row" key={meal.key} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 6, marginBottom: 6 }}>
              <div role="rowheader" className="font-hand" style={{ display: 'flex', alignItems: 'center', fontSize: 17, fontWeight: 600, color: 'var(--text-dark)' }}>
                {meal.label}
              </div>
              {DAYS.map((day, i) => {
                const dateIso = localIsoDate(weekDates[i])
                return (
                  <div role="cell" key={`${day.key}-${meal.key}`}>
                    <ClinicianMealSlot
                      items={(parentMealItems[dateIso] || {})[meal.key] || []}
                      status={(mealStatuses[dateIso] || {})[meal.key] || null}
                      distress={(mealDistress[dateIso] || {})[meal.key] || null}
                      isFuture={dateIso > TODAY_ISO}
                    />
                  </div>
                )
              })}
            </div>
          ))}

          <div role="row" style={{ display: 'grid', gridTemplateColumns: COLS, gap: 6, marginTop: 4 }}>
            <div role="rowheader" className="font-hand" style={{ display: 'flex', alignItems: 'center', fontSize: 17, fontWeight: 600 }}>
              Parent notes
            </div>
            {DAYS.map((day, i) => {
              const dateIso = localIsoDate(weekDates[i])
              const note = parentNotes.find(n => n.date === dateIso)
              const isUnread = note && !note.read_at
              return (
                <div role="cell" key={day.key} style={{
                  minHeight: 68, padding: 8, borderRadius: 'var(--radius)', boxSizing: 'border-box', fontSize: 13,
                  border: note ? '1px solid var(--rule-strong)' : '1px dashed var(--border-mid)',
                  background: isUnread ? 'var(--ink-light)' : 'white',
                }}>
                  {note && (
                    <>
                      <p className="font-hand" style={{ color: 'var(--ink)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{note.body}</p>
                      {isUnread ? (
                        <button onClick={() => onMarkNoteRead?.(note.id)} style={{ marginTop: 6, minHeight: 32, padding: '2px 0', border: 'none', background: 'none', color: 'var(--ink)', fontSize: 13, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>
                          Mark as read
                        </button>
                      ) : (
                        <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--text-mid)' }}>Read</span>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

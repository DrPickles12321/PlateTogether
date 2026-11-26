import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { lookupNutrition } from '../lib/nutritionService'
import { getWeekDates, localIsoDate } from '../lib/constants'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAppMode } from '../hooks/useAppMode'
import BottomSheet from '../components/BottomSheet'
import Icon, { OutcomeMark } from '../components/Icon'
import { OUTCOME_META } from '../lib/outcomes'

const DAYS = [
  { key: 'mon', label: 'Mon', full: 'Monday'    },
  { key: 'tue', label: 'Tue', full: 'Tuesday'   },
  { key: 'wed', label: 'Wed', full: 'Wednesday' },
  { key: 'thu', label: 'Thu', full: 'Thursday'  },
  { key: 'fri', label: 'Fri', full: 'Friday'    },
  { key: 'sat', label: 'Sat', full: 'Saturday'  },
  { key: 'sun', label: 'Sun', full: 'Sunday'    },
]

const TODAY_ISO = localIsoDate()

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', short: 'Bkfst' },
  { key: 'lunch',     label: 'Lunch',     short: 'Lunch' },
  { key: 'snack',     label: 'Snack',     short: 'Snack' },
  { key: 'dinner',    label: 'Dinner',    short: 'Dinner' },
]

function shortDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const MACRO_COLORS = {
  protein:       { color: 'var(--ink)', label: 'Protein' },
  carbs:         { color: 'var(--st-some)', label: 'Carbs'   },
  fruitsVeggies: { color: 'var(--mint)', label: 'F&V'     },
}

const PRODUCE_G_PER_SERVING = 80
const POPOVER_WIDTH = 280

// ─── Pie chart (single source of truth for macro values) ─────────────────────

function polarToCartesian(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  if (endDeg - startDeg >= 360) endDeg = startDeg + 359.99
  const s = polarToCartesian(cx, cy, r, startDeg)
  const e = polarToCartesian(cx, cy, r, endDeg)
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${endDeg - startDeg > 180 ? 1 : 0} 1 ${e.x} ${e.y} Z`
}

function MacroPie({ macros }) {
  const { protein, carbs, fruitsVeggies } = macros
  const total = protein + carbs + fruitsVeggies

  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          border: '2px dashed var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-light)', textAlign: 'center', padding: '0 8px' }}>No data</span>
        </div>
      </div>
    )
  }

  const segments = [
    { key: 'protein',       value: protein,       ...MACRO_COLORS.protein       },
    { key: 'carbs',         value: carbs,         ...MACRO_COLORS.carbs         },
    { key: 'fruitsVeggies', value: fruitsVeggies, ...MACRO_COLORS.fruitsVeggies },
  ].filter(s => s.value > 0)

  const cx = 50, cy = 50, r = 44, innerR = 18
  let angle = 0
  const arcs = segments.map(seg => {
    const sweep = (seg.value / total) * 360
    const path = arcPath(cx, cy, r, angle, angle + sweep)
    angle += sweep
    return { ...seg, path }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={100} height={100}>
        <circle cx={cx} cy={cy} r={r + 4} fill="white" stroke="var(--border)" strokeWidth={1} />
        {arcs.map(seg => (
          <path key={seg.key} d={seg.path} fill={seg.color} stroke="white" strokeWidth={1.5} />
        ))}
        <circle cx={cx} cy={cy} r={innerR} fill="white" />
      </svg>

      {/* Legend — same values used here as in the pie above */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
        {[
          { key: 'protein',       value: protein,       ...MACRO_COLORS.protein       },
          { key: 'carbs',         value: carbs,         ...MACRO_COLORS.carbs         },
          { key: 'fruitsVeggies', value: fruitsVeggies, ...MACRO_COLORS.fruitsVeggies },
        ].map(item => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{item.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>{item.value}g</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Day popover ──────────────────────────────────────────────────────────────

function DayPopover({ day, macros, style, popoverRef }) {
  const hasData = macros && (macros.protein + macros.carbs + macros.fruitsVeggies) > 0

  return (
    <div
      ref={popoverRef}
      style={{
        ...style,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        width: POPOVER_WIDTH,
      }}
    >
      {/* Header */}
      <div style={{
        background: 'var(--ink)', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>{day.full}</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>Daily summary</span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px' }}>
        {!hasData ? (
          <p style={{ fontSize: 13, color: 'var(--text-light)', textAlign: 'center', padding: '16px 0' }}>
            No meals logged for this day
          </p>
        ) : (
          <MacroPie macros={macros} />
        )}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function WeeklyView() {
  const { mealStatuses = {}, allMealItems = {}, weekOffset = 0, setWeekOffset } = useOutletContext()
  const isMobile = useIsMobile()
  const { hideNutritionNumbers } = useAppMode()
  const [openDay, setOpenDay]         = useState(null)
  const [sheetDay, setSheetDay]       = useState(null)
  const [popoverPos, setPopoverPos]   = useState({ top: 0, left: 0 })
  const popoverRef  = useRef(null)
  const headerRefs  = useRef({})

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  // ── close on outside click ──
  useEffect(() => {
    if (!openDay) return
    function onDown(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpenDay(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [openDay])

  // ── compute macros for a day ──
  const macrosByDay = useMemo(() => {
    const allStored = allMealItems
    const result = {}
    for (const day of DAYS) {
      const dateIso = weekDates[day.key]
      const localItems = Object.values(allStored[dateIso] || {}).flat()
      let protein = 0, carbs = 0, fruitsVeggies = 0
      for (const food of localItems) {
        const info = lookupNutrition(food)
        protein       += info.protein_g || 0
        carbs         += info.carbs_g   || 0
        fruitsVeggies += info.plate_zone === 'produce' ? PRODUCE_G_PER_SERVING : 0
      }
      result[day.key] = {
        protein:       Math.round(protein),
        carbs:         Math.round(carbs),
        fruitsVeggies: Math.round(fruitsVeggies),
      }
    }
    return result
  }, [weekDates, allMealItems])

  // ── day label click → compute viewport-safe position (desktop popover) ──
  const handleDayClick = useCallback((dayKey) => {
    if (hideNutritionNumbers) return
    if (isMobile) { setSheetDay(dayKey); return }
    if (openDay === dayKey) { setOpenDay(null); return }
    const el = headerRefs.current[dayKey]
    if (!el) return
    const rect = el.getBoundingClientRect()
    const idealLeft = rect.left + rect.width / 2 - POPOVER_WIDTH / 2
    const clampedLeft = Math.max(16, Math.min(idealLeft, window.innerWidth - POPOVER_WIDTH - 16))
    setPopoverPos({ top: rect.bottom + 8, left: clampedLeft })
    setOpenDay(dayKey)
  }, [openDay, hideNutritionNumbers, isMobile])

  const openDayObj = DAYS.find(d => d.key === openDay)
  const sheetDayObj = DAYS.find(d => d.key === sheetDay)
  const sheetMacros = sheetDay ? macrosByDay[sheetDay] : null
  const sheetHasData = sheetMacros && (sheetMacros.protein + sheetMacros.carbs + sheetMacros.fruitsVeggies) > 0
  const weekLabel = weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : weekOffset === 1 ? 'Next week'
    : `${shortDate(weekDates.mon)} – ${shortDate(weekDates.sun)}`
  const cols = isMobile ? '76px repeat(4, minmax(0, 1fr))' : '120px repeat(4, minmax(0, 1fr))'
  const navBtn = {
    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 'var(--radius)', border: '1px solid var(--border-mid)', background: 'white',
    color: 'var(--text-dark)', cursor: 'pointer',
  }

  // The week as a page of the notebook: one line per day, a pen mark per meal. Facts only,
  // no totals, percentages or streaks (PRODUCT.md: facts, not scores).
  return (
    <div style={{ padding: isMobile ? '12px 0 24px' : '24px 8px', maxWidth: 760, margin: '0 auto', width: '100%' }}>
      <div style={{ padding: isMobile ? '0 16px' : 0 }}>
        <h1 className="font-hand" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.1 }}>The week</h1>
        <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: '4px 0 14px' }}>
          {hideNutritionNumbers ? 'How each meal went.' : 'How each meal went. Tap a day for its nutrition summary.'}
        </p>
        <nav aria-label="Change week" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setWeekOffset(o => o - 1)} aria-label="Previous week" style={navBtn}><Icon name="left" /></button>
          <button onClick={() => setWeekOffset(o => o + 1)} aria-label="Next week" style={navBtn}><Icon name="right" /></button>
          <span style={{ fontSize: 15, fontWeight: 700, marginLeft: 4 }}>{weekLabel}</span>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={{ border: 'none', background: 'none', color: 'var(--ink)', fontSize: 15, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', minHeight: 44 }}>This week</button>
          )}
        </nav>
      </div>

      <div role="table" aria-label="Meals by day" style={{
        background: 'white', borderTop: '1px solid var(--rule-strong)', borderBottom: '1px solid var(--rule-strong)',
        ...(isMobile ? {} : { border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)' }),
      }}>
        <div role="row" style={{ display: 'grid', gridTemplateColumns: cols, borderBottom: '1px solid var(--rule-strong)', background: 'var(--surface-warm)' }}>
          <div role="columnheader" />
          {MEALS.map(meal => (
            <div role="columnheader" key={meal.key} style={{ padding: '10px 2px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>
              {isMobile ? meal.short : meal.label}
            </div>
          ))}
        </div>
        {DAYS.map(day => {
          const dateIso = weekDates[day.key]
          const isToday = dateIso === TODAY_ISO
          const isFuture = dateIso > TODAY_ISO
          const dayNum = new Date(dateIso + 'T12:00:00').getDate()
          const label = (
            <>
              <span className="font-hand" style={{ fontSize: 17, fontWeight: 600, display: 'block', lineHeight: 1.1 }}>{day.label}</span>
              <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{dayNum}{isToday ? ' · today' : ''}</span>
            </>
          )
          return (
            <div role="row" key={day.key} style={{
              display: 'grid', gridTemplateColumns: cols, borderBottom: '1px solid var(--rule)',
              background: isToday ? 'var(--ink-light)' : 'transparent',
            }}>
              <div role="rowheader" style={{ display: 'flex', alignItems: 'center', padding: '0 4px 0 12px', borderRight: '1px solid var(--margin)' }}>
                {hideNutritionNumbers ? (
                  <div style={{ padding: '8px 0' }}>{label}</div>
                ) : (
                  <button
                    ref={el => { headerRefs.current[day.key] = el }}
                    onClick={() => handleDayClick(day.key)}
                    aria-label={`${day.full}: nutrition summary`}
                    style={{ all: 'unset', cursor: 'pointer', minHeight: 52, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                  >{label}</button>
                )}
              </div>
              {MEALS.map(meal => {
                const status = mealStatuses[dateIso]?.[meal.key] || null
                const m = OUTCOME_META[status]
                return (
                  <div role="cell" key={meal.key} style={{
                    minHeight: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    color: m ? m.color : 'var(--text-mid)', fontSize: 12, fontWeight: 700,
                  }}>
                    {m ? (
                      <><OutcomeMark mark={m.mark} size={18} color={m.color} /><span>{m.label}</span></>
                    ) : (
                      <span style={{ fontWeight: 400 }}>{isFuture ? '' : 'Not logged'}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <BottomSheet open={!hideNutritionNumbers && !!sheetDay} onClose={() => setSheetDay(null)} title={sheetDayObj?.full || ''}>
        <h3 style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Daily nutrition summary</h3>
        {sheetHasData ? (
          <MacroPie macros={sheetMacros} />
        ) : (
          <p style={{ fontSize: 15, color: 'var(--text-mid)', textAlign: 'center', padding: '16px 0' }}>No meals logged for this day.</p>
        )}
      </BottomSheet>

      {openDay && openDayObj && (
        <DayPopover
          day={openDayObj}
          macros={macrosByDay[openDay]}
          popoverRef={popoverRef}
          style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 50 }}
        />
      )}
    </div>
  )
}

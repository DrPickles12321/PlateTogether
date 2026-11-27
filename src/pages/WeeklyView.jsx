import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { lookupNutrition } from '../lib/nutritionService'
import { getWeekDates, localIsoDate } from '../lib/constants'
import { useIsMobile } from '../hooks/useIsMobile'
import { useNutritionVisibility } from '../hooks/useNutritionVisibility'
import BottomSheet from '../components/BottomSheet'
import Icon, { OutcomeMark } from '../components/Icon'
import { OUTCOME_META, OUTCOME_ORDER } from '../lib/outcomes'
import { weekHighlights } from '../lib/weekHighlights'

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
  const { hideNutritionNumbers } = useNutritionVisibility()
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
    : 'That week'
  const rangeLabel = `${shortDate(weekDates.mon)} to ${shortDate(weekDates.sun)}`
  const highlights = weekHighlights({ mealStatuses, dates: DAYS.map(d => weekDates[d.key]), today: TODAY_ISO })
  const cols = isMobile ? '78px repeat(7, minmax(0, 1fr))' : '120px repeat(7, minmax(0, 1fr))'
  const edge = isMobile
    ? { borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }
    : { border: '1px solid var(--rule)' }
  const label13 = { fontSize: 13, fontWeight: 600, color: 'var(--ink)', padding: '18px 20px 6px' }
  const navBtn = {
    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 'var(--radius)', border: '1px solid rgba(250,249,246,0.35)', background: 'transparent',
    color: 'var(--on-ink)', cursor: 'pointer',
  }

  // The week: a forest band, a few plain sentences, then one mark per meal in one ink. Facts
  // only, no totals, percentages or streaks (PRODUCT.md: facts, not scores).
  return (
    <div style={{ paddingTop: isMobile ? 0 : 12, paddingBottom: 24, maxWidth: 760, margin: '0 auto', width: '100%' }}>
      <section aria-labelledby="week-title" style={{ background: 'var(--ink)', color: 'var(--on-ink)', padding: '16px 20px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontSize: 15, color: 'var(--on-ink-soft)' }}>{rangeLabel}</p>
          <h1 id="week-title" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--on-ink)' }}>{weekLabel}</h1>
        </div>
        <nav aria-label="Change week" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={{ border: 'none', background: 'none', color: 'var(--on-ink)', fontSize: 15, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', minHeight: 44, padding: '0 6px' }}>This week</button>
          )}
          <button onClick={() => setWeekOffset(o => o - 1)} aria-label="Previous week" style={navBtn}><Icon name="left" /></button>
          <button onClick={() => setWeekOffset(o => o + 1)} aria-label="Next week" style={navBtn}><Icon name="right" /></button>
        </nav>
      </section>

      {highlights.length > 0 && (
        <section aria-labelledby="highlights">
          <h2 id="highlights" style={label13}>Highlights</h2>
          <ul style={{ ...edge, listStyle: 'none', margin: 0, padding: '0 0 0 20px', background: 'white' }}>
            {highlights.map((h, i) => (
              <li key={h.topic} style={{ padding: '11px 20px 11px 0', borderBottom: i < highlights.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-light)' }}>{h.topic}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 17, lineHeight: 1.35 }}>{h.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="meals-grid">
        <h2 id="meals-grid" style={label13}>Meals</h2>
        <div style={{ ...edge, background: 'white', padding: '8px 14px 12px' }}>
          <div role="table" aria-labelledby="meals-grid">
            <div role="row" style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center' }}>
              <span role="columnheader" />
              {DAYS.map(day => {
                const dateIso = weekDates[day.key]
                const isToday = dateIso === TODAY_ISO
                const text = (
                  <>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: isToday ? 700 : 500 }}>{isMobile ? day.label.slice(0, 1) : day.label}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-light)' }}>{new Date(dateIso + 'T12:00:00').getDate()}</span>
                  </>
                )
                const style = { width: '100%', minHeight: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: isToday ? 'var(--ink)' : 'var(--text-mid)' }
                return (
                  <span role="columnheader" key={day.key}>
                    {hideNutritionNumbers ? <span style={style}>{text}</span> : (
                      <button
                        ref={el => { headerRefs.current[day.key] = el }}
                        onClick={() => handleDayClick(day.key)}
                        aria-label={`${day.full}: nutrition summary`}
                        style={{ ...style, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                      >{text}</button>
                    )}
                  </span>
                )
              })}
            </div>
            {MEALS.map(meal => (
              <div role="row" key={meal.key} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center' }}>
                <span role="rowheader" style={{ fontSize: 15, paddingLeft: 6, minHeight: 40, display: 'flex', alignItems: 'center' }}>{meal.label}</span>
                {DAYS.map(day => {
                  const dateIso = weekDates[day.key]
                  const status = mealStatuses[dateIso]?.[meal.key] || null
                  const m = OUTCOME_META[status]
                  const word = m ? m.label : dateIso > TODAY_ISO ? 'Not yet' : 'Not logged'
                  return (
                    <span role="cell" key={day.key} aria-label={`${day.full} ${meal.label.toLowerCase()}: ${word}`} style={{
                      minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: dateIso === TODAY_ISO ? 'var(--ink-light)' : 'transparent',
                    }}>
                      <OutcomeMark mark={m ? m.mark : 'later'} size={18} color={m ? m.color : undefined} />
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
          <ul aria-label="Key" style={{ listStyle: 'none', margin: '10px 0 0', padding: '10px 6px 0', borderTop: '1px solid var(--rule)', display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 13, color: 'var(--text-mid)' }}>
            {OUTCOME_ORDER.map(key => (
              <li key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <OutcomeMark mark={OUTCOME_META[key].mark} size={14} color={OUTCOME_META[key].color} />{OUTCOME_META[key].label}
              </li>
            ))}
          </ul>
        </div>
        {!hideNutritionNumbers && (
          <p style={{ fontSize: 13, color: 'var(--text-light)', padding: '6px 20px 0' }}>Tap a day for its nutrition summary.</p>
        )}
      </section>

      <Link to="/parent/stats" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 8, fontSize: 15, fontWeight: 600 }}>Read this week's summary</Link>

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

import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import {
  buildEvent, orderEvents, toMillis, buildFamilyState, legacyViews, legacyToEvents,
  CAREGIVER_EVENTS, TEAM_EVENTS,
} from './events'

const D = '2026-11-27'
const P1 = 'parent1', P2 = 'parent2', CLIN = 'clin1'
let clock = Date.parse('2026-11-27T12:00:00Z')
// Builds a stored event the way the app will: buildEvent, then a server time.
const ev = (input, by = P1, at = (clock += 60000)) => {
  const { event, error } = buildEvent({ date: D, ...input }, by)
  if (error) throw new Error(error)
  return { ...event, at }
}

describe('buildEvent', () => {
  it('builds a meal outcome', () => {
    expect(buildEvent({ type: 'meal.outcome', date: D, meal: 'dinner', value: 'refused' }, P1))
      .toEqual({ event: { type: 'meal.outcome', date: D, meal: 'dinner', value: 'refused', by: P1, v: 1 } })
  })

  it('refuses unknown types, bad dates, bad meals and a missing author', () => {
    expect(buildEvent({ type: 'weight', date: D, value: 40 }, P1).error).toBeTruthy()
    expect(buildEvent({ type: 'meal.outcome', date: '27/11/2026', meal: 'dinner', value: 'okay' }, P1).error).toBeTruthy()
    expect(buildEvent({ type: 'meal.outcome', date: D, meal: 'brunch', value: 'okay' }, P1).error).toBeTruthy()
    expect(buildEvent({ type: 'meal.outcome', date: D, value: 'okay' }, P1).error).toBeTruthy()
    expect(buildEvent({ type: 'meal.outcome', date: D, meal: 'dinner', value: 'okay' }, null).error).toBeTruthy()
  })

  it('checks each value', () => {
    const bad = [
      { type: 'meal.outcome', meal: 'lunch', value: 'great' },
      { type: 'meal.foods', meal: 'lunch', value: [{ name: '' }] },
      { type: 'meal.foods', meal: 'lunch', value: Array.from({ length: 13 }, (_, i) => ({ name: `f${i}` })) },
      { type: 'meal.distress', meal: 'lunch', value: { post: 6 } },
      { type: 'meal.distress', meal: 'lunch', value: { calm: 2 } },
      { type: 'meal.time', meal: 'lunch', value: '25:00' },
      { type: 'note.caregiver', value: { noteId: 'n1', body: 'x'.repeat(2001) } },
      { type: 'supplement.given', value: { name: 'Vitamin D' } },
    ]
    for (const input of bad) expect(buildEvent({ date: D, ...input }, P1).error, input.type).toBeTruthy()
    expect(buildEvent({ date: D, type: 'meal.distress', meal: 'lunch', value: { pre: null } }, P1).error).toBeUndefined()
    expect(buildEvent({ date: D, type: 'meal.outcome', meal: 'lunch', value: null }, P1).error).toBeUndefined()
  })

  it('uses the same event types as firestore.rules', () => {
    const rules = readFileSync('firestore.rules', 'utf8')
    const list = name => [...rules.match(new RegExp(`function ${name}\\(\\) \\{\\s*return \\[([^\\]]*)\\]`))[1].matchAll(/'([^']+)'/g)].map(m => m[1])
    expect(list('caregiverEvents')).toEqual(CAREGIVER_EVENTS)
    expect(list('teamEvents')).toEqual(TEAM_EVENTS)
  })
})

describe('ordering', () => {
  it('reads Firestore timestamps, milliseconds and ISO strings; unknown times come first', () => {
    expect(toMillis({ seconds: 10, nanoseconds: 5e6 })).toBe(10005)
    expect(toMillis({ toMillis: () => 42 })).toBe(42)
    expect(toMillis(new Date(7))).toBe(7)
    expect(toMillis('2026-11-27T00:00:00Z')).toBe(Date.parse('2026-11-27T00:00:00Z'))
    const events = [{ id: 'b', at: 20 }, { id: 'a', at: null }, { id: 'c', at: 10 }, { id: 'd', at: 10 }]
    expect(orderEvents(events).map(e => e.id)).toEqual(['a', 'c', 'd', 'b'])
  })
})

describe('buildFamilyState', () => {
  it('the latest outcome wins, and the change is kept', () => {
    const s = buildFamilyState([
      ev({ type: 'meal.outcome', meal: 'dinner', value: 'refused' }, P1, 1000),
      ev({ type: 'meal.outcome', meal: 'dinner', value: 'difficult' }, P2, 2000),
    ])
    expect(s.meals[D].dinner).toMatchObject({ status: 'difficult', loggedBy: P2, firstLoggedAt: 1000, lastChangedAt: 2000, outcomeChanges: 1 })
  })

  it('order comes from the time, not the order events arrive in', () => {
    const later = ev({ type: 'meal.outcome', meal: 'lunch', value: 'okay' }, P1, 5000)
    const earlier = ev({ type: 'meal.outcome', meal: 'lunch', value: 'refused' }, P1, 4000)
    expect(buildFamilyState([later, earlier]).meals[D].lunch.status).toBe('okay')
  })

  it('a null outcome clears the meal', () => {
    const s = buildFamilyState([
      ev({ type: 'meal.outcome', meal: 'snack', value: 'okay' }),
      ev({ type: 'meal.outcome', meal: 'snack', value: null }),
    ])
    expect(s.meals[D].snack.status).toBeNull()
  })

  it('foods replace, distress merges and null clears a rating', () => {
    const s = buildFamilyState([
      ev({ type: 'meal.foods', meal: 'dinner', value: [{ name: 'Pasta' }] }),
      ev({ type: 'meal.foods', meal: 'dinner', value: [{ name: 'Pasta' }, { name: 'Milk' }] }),
      ev({ type: 'meal.distress', meal: 'dinner', value: { pre: 4 } }),
      ev({ type: 'meal.distress', meal: 'dinner', value: { post: 2 } }),
      ev({ type: 'meal.distress', meal: 'lunch', value: { pre: 3 } }),
      ev({ type: 'meal.distress', meal: 'lunch', value: { pre: null } }),
      ev({ type: 'meal.time', meal: 'dinner', value: '18:30' }),
    ])
    expect(s.meals[D].dinner.items.map(f => f.name)).toEqual(['Pasta', 'Milk'])
    expect(s.meals[D].dinner.distress).toEqual({ pre: 4, post: 2 })
    expect(s.meals[D].dinner.time).toBe('18:30')
    expect(s.meals[D].lunch.distress).toBeNull()
  })

  it('supplements are ticked and unticked', () => {
    const s = buildFamilyState([
      ev({ type: 'supplement.given', value: { name: 'Vitamin D', given: true } }),
      ev({ type: 'supplement.given', value: { name: 'Multivitamin', given: true } }),
      ev({ type: 'supplement.given', value: { name: 'Vitamin D', given: false } }),
    ])
    expect(s.supplements[D]).toEqual(['Multivitamin'])
  })

  it('a note is read by a clinician, unread again after an edit, and gone after a delete', () => {
    const write = body => ev({ type: 'note.caregiver', value: { noteId: 'n1', body } })
    const read = () => ev({ type: 'note.read', ref: 'n1' }, CLIN)
    let s = buildFamilyState([write('Hard dinner.'), read()])
    expect(s.notes[D]).toMatchObject({ id: 'n1', body: 'Hard dinner.', readBy: [CLIN] })
    expect(s.notes[D].read_at).not.toBeNull()

    const events = [write('Hard dinner.'), read(), write('Hard dinner, better after.')]
    s = buildFamilyState(events)
    expect(s.notes[D]).toMatchObject({ body: 'Hard dinner, better after.', readBy: [], read_at: null })
    expect(s.notes[D].created_at).toBe(events[0].at)

    s = buildFamilyState([write('Hard dinner.'), ev({ type: 'note.caregiver', value: { noteId: 'n1', body: null } })])
    expect(s.notes[D]).toBeUndefined()
  })

  it('ignores events it does not read yet (hard meal mode, debrief)', () => {
    const s = buildFamilyState([ev({ type: 'hardMeal.start', meal: 'dinner' }), ev({ type: 'debrief', meal: 'dinner', value: { helped: 'stayed calm' } })])
    expect(s.meals).toEqual({})
  })
})

describe('legacyViews', () => {
  it('produces the shapes the screens read today', () => {
    const v = legacyViews(buildFamilyState([
      ev({ type: 'meal.outcome', meal: 'dinner', value: 'refused' }),
      ev({ type: 'meal.foods', meal: 'dinner', value: [{ id: 'f1', name: 'Pizza', category: 'challenge' }] }),
      ev({ type: 'meal.distress', meal: 'dinner', value: { post: 4 } }),
      ev({ type: 'meal.time', meal: 'dinner', value: '18:30' }),
      ev({ type: 'meal.foods', meal: 'lunch', value: [{ name: 'Rice' }] }),
    ]))
    expect(v.fbMealData[D].dinner).toEqual({ items: [{ id: 'f1', name: 'Pizza', category: 'challenge' }], status: 'refused', distress: { post: 4 } })
    expect(v.mealStatuses).toEqual({ [D]: { dinner: 'refused' } })
    expect(v.allMealItems[D].lunch).toEqual([{ name: 'Rice' }])
    expect(v.mealDistress).toEqual({ [D]: { dinner: { post: 4 } } })
    expect(v.mealTimesByDate).toEqual({ [D]: { dinner: '18:30' } })
  })
})

describe('legacyToEvents (migration)', () => {
  const legacy = {
    mealLogs: {
      '2026-11-26': {
        breakfast: { status: 'okay', items: { a: { id: 'f1', name: 'Oatmeal', category: 'familiar' } } },
        dinner: { status: 'refused', items: [{ id: 'f2', name: 'Pizza', category: 'challenge' }], distress: { pre: 4, post: 3 } },
      },
      [D]: { lunch: { status: 'difficult' }, snack: { items: [{ id: 'f3', name: 'Granola bar' }] } },
    },
    mealTimes: { '2026-11-26': { dinner: '18:30' } },
    supplementLog: { [D]: ['Vitamin D'] },
    parentNotes: {
      '2026-11-26': { id: 'n1', date: '2026-11-26', body: 'Pizza was hard.', created_at: '2026-11-26T20:00:00.000Z', read_at: '2026-11-27T09:00:00.000Z' },
      [D]: { id: 'n2', date: D, body: 'Better lunch.', created_at: '2026-11-27T13:00:00.000Z', read_at: null },
    },
  }

  it('marks every event as migrated, by the parent, with no meal time', () => {
    const events = legacyToEvents(legacy, P1)
    const meals = events.filter(e => e.type.startsWith('meal.'))
    expect(meals.every(e => e.legacy && e.by === P1 && e.at === null)).toBe(true)
  })

  it('round-trips: the migrated record shows exactly what the screens show today', () => {
    const v = legacyViews(buildFamilyState(legacyToEvents(legacy, P1)))
    expect(v.mealStatuses).toEqual({ '2026-11-26': { breakfast: 'okay', dinner: 'refused' }, [D]: { lunch: 'difficult' } })
    expect(v.allMealItems['2026-11-26'].breakfast).toEqual([{ id: 'f1', name: 'Oatmeal', category: 'familiar' }])
    expect(v.allMealItems[D].snack).toEqual([{ id: 'f3', name: 'Granola bar' }])
    expect(v.mealDistress).toEqual({ '2026-11-26': { dinner: { pre: 4, post: 3 } } })
    expect(v.mealTimesByDate).toEqual(legacy.mealTimes)
    expect(v.supplementLog).toEqual(legacy.supplementLog)
    expect(v.parentNotesByDate['2026-11-26']).toEqual({ id: 'n1', date: '2026-11-26', body: 'Pizza was hard.', created_at: '2026-11-26T20:00:00.000Z', read_at: '2026-11-27T09:00:00.000Z' })
    expect(v.parentNotesByDate[D].read_at).toBeNull()
  })

  it('skips empty notes and handles a parent with no data', () => {
    expect(legacyToEvents({ parentNotes: { [D]: { id: 'n3', body: '' } } }, P1)).toEqual([])
    expect(legacyToEvents({}, P1)).toEqual([])
  })
})

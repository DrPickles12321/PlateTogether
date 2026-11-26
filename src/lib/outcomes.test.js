import { describe, it, expect } from 'vitest'
import { needsSupport, outcomeLabel, OUTCOME_META, OUTCOME_ORDER } from './outcomes'
import { HARD_MEAL, hardMealNote } from './supportCopy'

describe('needsSupport', () => {
  it('answers a refusal even with no distress rating', () => {
    expect(needsSupport({ status: 'refused' })).toBe(true)
  })

  it('answers distress at the hard end of the scale, before or after', () => {
    expect(needsSupport({ status: 'okay', distress: { post: 4 } })).toBe(true)
    expect(needsSupport({ status: 'difficult', distress: { pre: 5 } })).toBe(true)
  })

  it('stays quiet for an ordinary meal or a skipped one', () => {
    expect(needsSupport({ status: 'okay', distress: { pre: 3, post: 2 } })).toBe(false)
    expect(needsSupport({ status: 'skipped', distress: { post: 5 } })).toBe(false)
    expect(needsSupport({})).toBe(false)
  })
})

describe('outcome vocabulary', () => {
  it('has one word for each stored status', () => {
    expect(OUTCOME_ORDER.map(outcomeLabel)).toEqual(['Finished', 'Partly', 'Refused', 'Skipped'])
    expect(outcomeLabel('unknown')).toBe('')
  })

  it('pairs every outcome with a mark so colour is never the only signal', () => {
    for (const key of OUTCOME_ORDER) expect(OUTCOME_META[key].mark).toBeTruthy()
  })
})

describe('hard-meal wording', () => {
  const all = Object.values(HARD_MEAL).join(' ')

  it('gives no numbers except emergency lines', () => {
    expect(all.replace(/911|988/g, '')).not.toMatch(/\d/)
  })

  it('never talks about calories, weight or making up for food', () => {
    expect(all).not.toMatch(/calor|weigh|burn|compensat|portion|diet/i)
  })

  it('points to people, not advice', () => {
    expect(HARD_MEAL.messageAction).toMatch(/care team/)
    expect(HARD_MEAL.notMonitored).toMatch(/911/)
  })

  it('names the meal in the message to the clinician', () => {
    expect(hardMealNote({ mealLabel: 'Dinner', dateLabel: 'Thu, Nov 26', outcomeLabel: 'Refused' }))
      .toBe('Hard dinner on Thu, Nov 26 (refused).')
  })
})

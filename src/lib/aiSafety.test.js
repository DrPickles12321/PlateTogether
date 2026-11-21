import { describe, it, expect } from 'vitest'
import {
  classifyUserMessage, safetyReplyFor, violatesReplyPolicy, enforceReplyPolicy,
  CRISIS_MESSAGE, URGENT_MESSAGE, FALLBACK_MESSAGE,
} from './aiSafety'

describe('classifyUserMessage', () => {
  it.each([
    'She said she wants to die',
    'I think he is suicidal',
    "he's been hurting himself",
    'My daughter fainted at dinner',
    'He passed out in the kitchen',
    'She has chest pain after eating',
    "He can't breathe properly",
    'She talked about self harm',
  ])('flags emergency: %s', text => {
    expect(classifyUserMessage(text)).toBe('emergency')
  })

  it.each([
    'I think she is purging after dinner',
    'He found laxatives in her room',
    "She hasn't eaten all day",
    'He refused to eat anything yesterday',
    'she is not drinking water',
    "He didn't eat today",
  ])('flags urgent: %s', text => {
    expect(classifyUserMessage(text)).toBe('urgent')
  })

  it.each([
    'How did this week go?',
    'Breakfast went well today',
    'He had a hard dinner but finished it',
    'She ate toast and a banana',
    '',
    null,
    undefined,
  ])('leaves ordinary messages alone: %s', text => {
    expect(classifyUserMessage(text)).toBeNull()
  })

  it('treats emergency as more serious than urgent when both appear', () => {
    expect(classifyUserMessage('She purges and fainted yesterday')).toBe('emergency')
  })
})

describe('safetyReplyFor', () => {
  it('returns the fixed crisis text with 988 and 911 for emergencies', () => {
    const reply = safetyReplyFor('He wants to die')
    expect(reply).toBe(CRISIS_MESSAGE)
    expect(reply).toContain('988')
    expect(reply).toContain('911')
  })
  it('returns the urgent text for urgent messages', () => {
    expect(safetyReplyFor("She hasn't eaten all day")).toBe(URGENT_MESSAGE)
  })
  it('returns null when the message can go to the model', () => {
    expect(safetyReplyFor('How was the week?')).toBeNull()
  })
})

describe('violatesReplyPolicy / enforceReplyPolicy', () => {
  it.each([
    'That meal was about 450 calories.',
    'She weighs 95 lbs now.',
    'Her BMI is low.',
    'Maybe she could burn it off with a walk.',
    'Try to lose weight slowly.',
    'It sounds like she has anorexia.',
    'He is anorexic.',
    'She could skip a meal tomorrow.',
  ])('blocks: %s', text => {
    expect(violatesReplyPolicy(text)).toBe(true)
    expect(enforceReplyPolicy(text)).toBe(FALLBACK_MESSAGE)
  })

  it.each([
    'Great week! 3 of 4 dinners went okay.',
    'Lunch was the hardest meal. Want me to let your care team know?',
    "I don't have that information in this week's log.",
    'Recovery from anorexia takes time, and you are doing a lot.',
  ])('allows: %s', text => {
    expect(violatesReplyPolicy(text)).toBe(false)
    expect(enforceReplyPolicy(text)).toBe(text)
  })

  it('handles non-string input without throwing', () => {
    expect(violatesReplyPolicy(undefined)).toBe(false)
    expect(enforceReplyPolicy(undefined)).toBeUndefined()
  })
})

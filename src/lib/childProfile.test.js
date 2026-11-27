import { describe, it, expect } from 'vitest'
import { cleanProfileInput, ageText, treatmentWeek, profileDetails, familyName } from './childProfile'

const TODAY = '2026-11-27'

describe('cleanProfileInput', () => {
  it('trims the name and keeps optional fields empty', () => {
    expect(cleanProfileInput({ name: '  M.  K. ', birthYear: '', treatmentStart: '' }, TODAY))
      .toEqual({ value: { name: 'M. K.', birthYear: null, treatmentStart: null } })
  })

  it('needs a name', () => {
    expect(cleanProfileInput({ name: '   ' }, TODAY).error).toMatch(/first name or initials/)
  })

  it('refuses a long name', () => {
    expect(cleanProfileInput({ name: 'x'.repeat(41) }, TODAY).error).toMatch(/under 40/)
  })

  it('checks the birth year', () => {
    expect(cleanProfileInput({ name: 'Sam', birthYear: '2012' }, TODAY).value.birthYear).toBe(2012)
    expect(cleanProfileInput({ name: 'Sam', birthYear: '12' }, TODAY).error).toBeTruthy()
    expect(cleanProfileInput({ name: 'Sam', birthYear: '2030' }, TODAY).error).toBeTruthy()
  })

  it('refuses a treatment start in the future', () => {
    expect(cleanProfileInput({ name: 'Sam', treatmentStart: '2026-12-01' }, TODAY).error).toBeTruthy()
    expect(cleanProfileInput({ name: 'Sam', treatmentStart: '2026-10-16' }, TODAY).value.treatmentStart).toBe('2026-10-16')
  })
})

describe('profile details', () => {
  it('gives an age range from the birth year', () => {
    expect(ageText(2012, TODAY)).toBe('13–14')
    expect(ageText(null, TODAY)).toBeNull()
  })

  it('counts treatment weeks from the start date', () => {
    expect(treatmentWeek(TODAY, TODAY)).toBe(1)
    expect(treatmentWeek('2026-11-20', TODAY)).toBe(2)
    expect(treatmentWeek('2026-10-16', TODAY)).toBe(7)
    expect(treatmentWeek('2027-01-01', TODAY)).toBeNull()
  })

  it('joins what is known into one line', () => {
    expect(profileDetails({ name: 'Sam', birthYear: 2012, treatmentStart: '2026-10-16', phase: 1 }, TODAY))
      .toBe('age 13–14 · week 7 of treatment · phase 1')
    expect(profileDetails({ name: 'Sam' }, TODAY)).toBe('')
    expect(profileDetails(null, TODAY)).toBe('')
  })

  it('falls back to the email when there is no name', () => {
    expect(familyName({ name: 'Sam' }, 'parent@example.test')).toBe('Sam')
    expect(familyName(null, 'parent@example.test')).toBe('parent@example.test')
    expect(familyName({ name: '  ' }, '')).toBe('Family')
  })
})

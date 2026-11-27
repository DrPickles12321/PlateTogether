import { describe, it, expect } from 'vitest'
import { parentSeesNumbers } from './nutritionVisibility'

describe('parentSeesNumbers', () => {
  it('hides numbers until the clinician turns them on', () => {
    expect(parentSeesNumbers(null)).toBe(false)
    expect(parentSeesNumbers(undefined)).toBe(false)
    expect(parentSeesNumbers({ showToParent: false })).toBe(false)
    expect(parentSeesNumbers({ showToParent: true })).toBe(true)
  })

  it('ignores anything that is not a clear yes', () => {
    expect(parentSeesNumbers({ showToParent: 'yes' })).toBe(false)
    expect(parentSeesNumbers({})).toBe(false)
  })
})

describe('the program default', () => {
  it('applies only when the clinician has not chosen', () => {
    expect(parentSeesNumbers(null, { parentSeesNumbers: true })).toBe(true)
    expect(parentSeesNumbers({ showToParent: false }, { parentSeesNumbers: true })).toBe(false)
    expect(parentSeesNumbers({ showToParent: true }, { parentSeesNumbers: false })).toBe(true)
  })
})

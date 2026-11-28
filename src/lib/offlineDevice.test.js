import { describe, it, expect } from 'vitest'
import { keepsRecordOnDevice, rememberRole, rememberedRole, forgetDevice } from './offlineDevice'

const memory = () => {
  const m = new Map()
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }
}

describe('what the device remembers for offline use', () => {
  it('keeps the record on the device only after a parent signs in', () => {
    const s = memory()
    expect(keepsRecordOnDevice(s)).toBe(false)
    rememberRole(s, 'p1', 'parent')
    expect(keepsRecordOnDevice(s)).toBe(true)
    rememberRole(s, 'c1', 'clinician')
    expect(keepsRecordOnDevice(s)).toBe(false)
  })

  it('gives back the role only for the same person', () => {
    const s = memory()
    rememberRole(s, 'p1', 'parent')
    expect(rememberedRole(s, 'p1')).toBe('parent')
    expect(rememberedRole(s, 'someone-else')).toBeNull()
  })

  it('ignores unknown roles and broken values', () => {
    const s = memory()
    rememberRole(s, 'p1', 'admin')
    expect(rememberedRole(s, 'p1')).toBeNull()
    s.setItem('pt_role', '{not json')
    expect(rememberedRole(s, 'p1')).toBeNull()
  })

  it('forgets everything on sign-out', () => {
    const s = memory()
    rememberRole(s, 'p1', 'parent')
    forgetDevice(s)
    expect(s.m.size).toBe(0)
  })

  it('never throws when storage is blocked', () => {
    const blocked = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
    expect(() => rememberRole(blocked, 'p1', 'parent')).not.toThrow()
    expect(keepsRecordOnDevice(blocked)).toBe(false)
    expect(rememberedRole(blocked, 'p1')).toBeNull()
    expect(keepsRecordOnDevice(null)).toBe(false)
  })
})

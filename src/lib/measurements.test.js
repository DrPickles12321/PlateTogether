import { describe, it, expect } from 'vitest'
import { readingsFromForm, byVisit, weightChange, toKg, formatSigned } from './measurements'

const D = '2026-11-28'

describe('the visit form', () => {
  it('turns filled fields into readings and skips empty ones', () => {
    expect(readingsFromForm({ date: D, weight: '45,26', weightUnit: 'kg', heartRate: '48', bpSys: '104', bpDia: '62' }).readings).toEqual([
      { kind: 'weight', value: 45.3, unit: 'kg', date: D },
      { kind: 'heartRate', value: 48, unit: 'bpm', date: D },
      { kind: 'bloodPressure', value: 104, value2: 62, unit: 'mmHg', date: D },
    ])
    expect(readingsFromForm({ date: D, heartRate: '51' }).readings).toEqual([{ kind: 'heartRate', value: 51, unit: 'bpm', date: D }])
  })

  it('catches slips in plain words', () => {
    expect(readingsFromForm({ date: D }).error).toMatch(/at least one/)
    expect(readingsFromForm({ date: '', weight: '45' }).error).toMatch(/date/)
    expect(readingsFromForm({ date: D, weight: '450', weightUnit: 'kg' }).error).toMatch(/Weight/)
    expect(readingsFromForm({ date: D, bpSys: '104' }).error).toMatch(/both numbers/)
    expect(readingsFromForm({ date: D, heartRate: 'abc' }).error).toMatch(/Heart rate/)
  })
})

describe('visits and weight change', () => {
  const ms = [
    { kind: 'weight', value: 44.0, unit: 'kg', date: '2026-11-01', atMs: 1 },
    { kind: 'heartRate', value: 46, unit: 'bpm', date: '2026-11-01', atMs: 2 },
    { kind: 'weight', value: 99.9, unit: 'lb', date: '2026-11-14', atMs: 3 },
    { kind: 'weight', value: 45.6, unit: 'kg', date: '2026-11-28', atMs: 4 },
    { kind: 'weight', value: 45.8, unit: 'kg', date: '2026-11-28', atMs: 5 },
    { kind: 'bloodPressure', value: 102, value2: 60, unit: 'mmHg', date: '2026-11-28', atMs: 6 },
  ]

  it('groups readings by visit, newest first, later entry wins', () => {
    const v = byVisit(ms)
    expect(v.map(x => x.date)).toEqual(['2026-11-28', '2026-11-14', '2026-11-01'])
    expect(v[0]).toEqual({ date: '2026-11-28', weight: { value: 45.8, unit: 'kg' }, heartRate: null, bloodPressure: { sys: 102, dia: 60 } })
  })

  it('works out change since the previous and the first visit across units', () => {
    expect(Math.round(toKg({ value: 99.9, unit: 'lb' }) * 10) / 10).toBe(45.3)
    expect(weightChange(byVisit(ms))).toEqual({
      unit: 'kg',
      sincePrevious: { value: 0.5, date: '2026-11-14' },
      sinceFirst: { value: 1.8, date: '2026-11-01' },
    })
    expect(weightChange(byVisit(ms.slice(0, 2)))).toBeNull()
    expect(formatSigned(0.5)).toBe('+0.5')
    expect(formatSigned(-0.2)).toBe('-0.2')
  })
})

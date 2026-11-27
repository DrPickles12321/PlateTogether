import { describe, it, expect } from 'vitest'
import { PROGRAMS, DEFAULT_PROGRAM, programConfig, phaseLabels } from './programs'

describe('programConfig', () => {
  it('gives the settings for a program and phase', () => {
    expect(programConfig('anorexia-fbt', 2)).toMatchObject({ program: 'anorexia-fbt', phase: 2, teen: 'proposals', parentSeesNumbers: false })
    expect(programConfig('anorexia-fbt', 'maintenance')).toMatchObject({ logging: 'light', teen: 'reflect' })
  })

  it('treats an unset or unknown phase as phase 1, the most protective', () => {
    expect(programConfig('anorexia-fbt', null)).toMatchObject({ phase: 1, teen: 'none' })
    expect(programConfig('anorexia-fbt', 9)).toMatchObject({ phase: 1 })
    expect(programConfig()).toMatchObject({ program: DEFAULT_PROGRAM, phase: 1 })
  })

  it('falls back to the default program for an unknown one, including prototype keys', () => {
    expect(programConfig('bulimia', 2)).toMatchObject({ program: DEFAULT_PROGRAM, phase: 2 })
    expect(programConfig('toString', 1)).toMatchObject({ program: DEFAULT_PROGRAM })
  })
})

describe('the anorexia program', () => {
  const phases = Object.values(PROGRAMS['anorexia-fbt'].phases)

  it('never shows parents numbers by default, in any phase', () => {
    expect(phases.every(p => p.parentSeesNumbers === false)).toBe(true)
  })

  it('gives the teen nothing about food in phase 1', () => {
    expect(PROGRAMS['anorexia-fbt'].phases[1].teen).toBe('none')
  })

  it('every phase has a label, a teen setting, signals and a guide', () => {
    for (const p of phases) {
      expect(p.label).toBeTruthy()
      expect(['none', 'proposals', 'reflect']).toContain(p.teen)
      expect(p.signals.length).toBeGreaterThan(0)
      expect(p.guide).toBeTruthy()
    }
  })
})

describe('phaseLabels', () => {
  it('lists the treatment phases a clinician picks, without maintenance', () => {
    expect(Object.keys(phaseLabels())).toEqual(['1', '2', '3'])
    expect(phaseLabels()[1]).toBe('Phase 1: parents take charge of eating')
  })
})

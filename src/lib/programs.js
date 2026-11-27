// What each treatment program and phase turns on or off (docs/plans/2026-11-27-fbt-framework.md, section 5).
// Screens ask here instead of checking a program or phase themselves. Adding a program means adding a
// block below with clinician-reviewed wording, not new screens.
//
// Per phase:
//   parentSeesNumbers  default for nutrition numbers on parent screens; the clinician's switch overrides it
//   teen               'none' | 'proposals' (propose a meal, a parent decides) | 'reflect' (own check-ins)
//   logging            'full' | 'light' (maintenance: fewer prompts)
//   signals            which clinician signals matter in this phase (roadmap phases D and F)
//   guide              which session guide applies (roadmap E2)

export const DEFAULT_PROGRAM = 'anorexia-fbt'

export const PROGRAMS = {
  'anorexia-fbt': {
    label: 'Anorexia (family-based treatment)',
    phases: {
      1: {
        label: 'Phase 1: parents take charge of eating',
        parentSeesNumbers: false, teen: 'none', logging: 'full',
        signals: ['earlyResponse', 'hardMeals', 'strain', 'sync'], guide: 'phase1',
      },
      2: {
        label: 'Phase 2: control handed back gradually',
        parentSeesNumbers: false, teen: 'proposals', logging: 'full',
        signals: ['hardMeals', 'relapseWatch', 'handover', 'strain', 'sync'], guide: 'phase2',
      },
      3: {
        label: 'Phase 3: back to everyday life',
        parentSeesNumbers: false, teen: 'reflect', logging: 'full',
        signals: ['relapseWatch'], guide: 'phase3',
      },
      maintenance: {
        label: 'After treatment: keeping well',
        parentSeesNumbers: false, teen: 'reflect', logging: 'light',
        signals: ['relapseWatch'], guide: 'maintenance',
      },
    },
  },
}

// Before a clinician sets a phase, the family is treated as phase 1: the most protective settings.
const FALLBACK_PHASE = 1

// The settings for a program and phase. Unknown programs fall back to the default program, and an unset or
// unknown phase falls back to phase 1.
export function programConfig(programKey = DEFAULT_PROGRAM, phase = null) {
  const known = Object.hasOwn(PROGRAMS, programKey)
  const program = known ? PROGRAMS[programKey] : PROGRAMS[DEFAULT_PROGRAM]
  const key = phase != null && Object.hasOwn(program.phases, phase) ? phase : FALLBACK_PHASE
  return { program: known ? programKey : DEFAULT_PROGRAM, programLabel: program.label, phase: key, ...program.phases[key] }
}

// { phase: label } for the treatment phases a clinician picks today (maintenance comes with roadmap E4).
export function phaseLabels(programKey = DEFAULT_PROGRAM) {
  const program = Object.hasOwn(PROGRAMS, programKey) ? PROGRAMS[programKey] : PROGRAMS[DEFAULT_PROGRAM]
  return Object.fromEntries(Object.entries(program.phases).filter(([k]) => k !== 'maintenance').map(([k, v]) => [k, v.label]))
}

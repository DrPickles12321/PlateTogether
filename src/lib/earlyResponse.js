// Early response (roadmap D2): is the family on track by session 4? For clinicians only, never shown to the
// family. Built from clinic weights (lib/measurements.js) and the sessions the team marked ("Session done
// today"). The threshold is the clinician's to change; defaults come from the research in
// docs/plans/2026-11-27-fbt-framework.md: 2.88% of ideal body weight by session 4 [4], and about 2.3 to 2.8 kg
// by sessions 3 to 5 [10]. The app reports the numbers and the evidence behind them; it suggests nothing.
import { toKg } from './measurements'

export const EARLY_RESPONSE_DEFAULTS = { mode: 'kg', kg: 2.3, pct: 2.88, ibwKg: null, bySession: 4, priorSessions: 0 }

const round1 = v => Math.round(v * 10) / 10

export function earlyResponseConfig(saved) {
  const c = { ...EARLY_RESPONSE_DEFAULTS, ...(saved || {}) }
  const pos = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d)
  return {
    mode: c.mode === 'ibw' && pos(c.ibwKg, null) ? 'ibw' : 'kg',
    kg: pos(c.kg, EARLY_RESPONSE_DEFAULTS.kg),
    pct: pos(c.pct, EARLY_RESPONSE_DEFAULTS.pct),
    ibwKg: pos(c.ibwKg, null),
    bySession: Math.round(pos(c.bySession, 4)),
    priorSessions: Math.max(0, Math.round(Number(c.priorSessions) || 0)),
  }
}

export function thresholdKg(config) {
  const c = earlyResponseConfig(config)
  return c.mode === 'ibw' ? round1((c.ibwKg * c.pct) / 100) : c.kg
}

// visits: byVisit() output (any order). sessions: [{ date: 'YYYY-MM-DD' }] (any order, repeats allowed).
// Returns { status, ... } where status is:
//   'noWeights'  no weight recorded yet
//   'inProgress' session N not reached yet (gainKg is so far)
//   'onTrack' | 'below'  session N reached; gain by then compared with the threshold
//   'needWeight' session N reached but no weight after the starting one by then
//   'pastWindow' session N was before Plate Together (prior sessions cover it)
export function earlyResponse({ visits = [], sessions = [], config } = {}) {
  const c = earlyResponseConfig(config)
  const threshold = thresholdKg(c)
  const sessionDates = [...new Set(sessions.map(s => s.date).filter(Boolean))].sort()
  const sessionCount = c.priorSessions + sessionDates.length
  const weights = visits.filter(v => v.weight).map(v => ({ date: v.date, kg: toKg(v.weight), shown: v.weight }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const base = { threshold, bySession: c.bySession, sessionCount, sessionDates, config: c }
  if (c.priorSessions >= c.bySession) return { ...base, status: 'pastWindow' }
  if (!weights.length) return { ...base, status: 'noWeights' }

  const firstSession = sessionDates[0]
  const baselineBeforeStart = firstSession ? [...weights].reverse().find(w => w.date <= firstSession) : null
  const baseline = baselineBeforeStart || weights[0]
  const baselineLate = !!firstSession && !baselineBeforeStart && c.priorSessions === 0

  const reached = sessionCount >= c.bySession
  const cutoff = reached ? sessionDates[c.bySession - c.priorSessions - 1] : null
  const candidates = weights.filter(w => w.date > baseline.date && (!cutoff || w.date <= cutoff))
  const point = candidates[candidates.length - 1] || null
  const result = { ...base, baseline, baselineLate, cutoff, point }
  if (!point) return { ...result, status: reached ? 'needWeight' : 'inProgress', gainKg: null }
  const gainKg = round1(point.kg - baseline.kg)
  if (!reached) return { ...result, status: 'inProgress', gainKg }
  return { ...result, status: gainKg >= threshold ? 'onTrack' : 'below', gainKg }
}

// The words for a result, shared by the overview card and the session summary. Clinician-facing; numbers and
// evidence only, no advice. DRAFT for the clinician review (docs/clinical/2026-11-27-clinician-metrics-draft.md).
const day = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const signed = v => (v > 0 ? `+${v}` : `${v}`)

export function earlyResponseText(r) {
  const t = `${r.threshold} kg by session ${r.bySession}`
  const evidence = []
  if (r.baseline) evidence.push(`Starting weight ${r.baseline.shown.value} ${r.baseline.shown.unit} on ${day(r.baseline.date)}${r.baselineLate ? ' (recorded after the first marked session)' : ''}.`)
  if (r.point) evidence.push(`Weight used ${r.point.shown.value} ${r.point.shown.unit} on ${day(r.point.date)}.`)
  if (r.sessionDates?.length) evidence.push(`Sessions marked: ${r.sessionDates.map(day).join(', ')}${r.config?.priorSessions ? `, plus ${r.config.priorSessions} before Plate Together` : ''}.`)
  const headline = {
    noWeights: 'No clinic weights yet. Record weight at visits to see early response.',
    pastWindow: `Session ${r.bySession} was before Plate Together, so early response can't be worked out here.`,
    needWeight: `Session ${r.bySession} has passed, but no weight after the starting one was recorded by then.`,
    inProgress: r.gainKg == null
      ? `Session ${r.sessionCount} of ${r.bySession}. One weight so far; the threshold is ${t}.`
      : `Session ${r.sessionCount} of ${r.bySession}: ${signed(r.gainKg)} kg so far. The threshold is ${t}.`,
    onTrack: `On track: ${signed(r.gainKg)} kg by session ${r.bySession} (threshold ${r.threshold} kg).`,
    below: `Below the early-response threshold: ${signed(r.gainKg)} kg by session ${r.bySession} (threshold ${r.threshold} kg).`,
  }[r.status]
  return { headline, evidence }
}

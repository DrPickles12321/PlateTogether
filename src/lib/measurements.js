// Clinic measurements (roadmap D1): weight and vitals a clinician types in at a visit. Clinician-only, except
// weight, which parents see only when the lead therapist shares it, plainly and without commentary. The teen
// never sees any of it. Stored as one document per reading (firestore.rules checks the same shapes):
//   { kind: 'weight'|'heartRate'|'bloodPressure', value, value2?, unit, date: 'YYYY-MM-DD', by, at }
// Ranges here only catch typing slips; they are not clinical limits.

const LB_PER_KG = 2.20462

const RANGE = {
  weight: { kg: [1, 320], lb: [2, 700] },
  heartRate: [20, 250],
  sys: [40, 260],
  dia: [20, 180],
}

const num = v => (v === '' || v == null ? null : Number(String(v).replace(',', '.')))
const inRange = (v, [lo, hi]) => Number.isFinite(v) && v >= lo && v <= hi

// The clinician's visit form to readings, or { error } in plain words. Empty fields are skipped.
export function readingsFromForm({ date, weight, weightUnit = 'kg', heartRate, bpSys, bpDia }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { error: 'Pick the visit date.' }
  const readings = []
  const w = num(weight), hr = num(heartRate), sys = num(bpSys), dia = num(bpDia)
  if (w != null) {
    if (!RANGE.weight[weightUnit] || !inRange(w, RANGE.weight[weightUnit])) return { error: `Weight doesn't look right in ${weightUnit}.` }
    readings.push({ kind: 'weight', value: Math.round(w * 10) / 10, unit: weightUnit, date })
  }
  if (hr != null) {
    if (!inRange(hr, RANGE.heartRate)) return { error: "Heart rate doesn't look right." }
    readings.push({ kind: 'heartRate', value: Math.round(hr), unit: 'bpm', date })
  }
  if (sys != null || dia != null) {
    if (!inRange(sys, RANGE.sys) || !inRange(dia, RANGE.dia)) return { error: 'Blood pressure needs both numbers, like 104 / 62.' }
    readings.push({ kind: 'bloodPressure', value: Math.round(sys), value2: Math.round(dia), unit: 'mmHg', date })
  }
  if (!readings.length) return { error: 'Enter at least one reading.' }
  return { readings }
}

const dayOf = m => m.date || (typeof m.at === 'string' ? m.at.slice(0, 10) : null)

// One row per visit day, newest first; if a reading was typed twice that day, the later one counts.
export function byVisit(measurements = []) {
  const days = new Map()
  const sorted = [...measurements].sort((a, b) => (a.atMs ?? 0) - (b.atMs ?? 0))
  for (const m of sorted) {
    const date = dayOf(m)
    if (!date) continue
    const row = days.get(date) || { date, weight: null, heartRate: null, bloodPressure: null }
    if (m.kind === 'weight') row.weight = { value: m.value, unit: m.unit }
    if (m.kind === 'heartRate') row.heartRate = { value: m.value, unit: m.unit }
    if (m.kind === 'bloodPressure') row.bloodPressure = { sys: m.value, dia: m.value2 }
    days.set(date, row)
  }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export const toKg = ({ value, unit }) => (unit === 'lb' ? value / LB_PER_KG : value)
const fromKg = (kg, unit) => (unit === 'lb' ? kg * LB_PER_KG : kg)
const round1 = v => Math.round(v * 10) / 10

// For the clinician only: weight change since the first recorded visit and since the one before, in the unit
// of the latest weight. Null where there isn't enough to compare.
export function weightChange(visits = []) {
  const weights = visits.filter(v => v.weight)
  if (weights.length < 2) return null
  const [latest, previous] = weights
  const first = weights[weights.length - 1]
  const unit = latest.weight.unit
  return {
    unit,
    sincePrevious: { value: round1(fromKg(toKg(latest.weight) - toKg(previous.weight), unit)), date: previous.date },
    sinceFirst: { value: round1(fromKg(toKg(latest.weight) - toKg(first.weight), unit)), date: first.date },
  }
}

export const formatWeight = w => (w ? `${w.value} ${w.unit}` : '')
export const formatSigned = v => (v > 0 ? `+${v}` : `${v}`)

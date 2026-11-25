import { useMemo } from 'react'
import { buildSessionPrep } from '../lib/sessionPrep'
import { getWeekIsoDates } from '../lib/insights'
import { SectionCard } from '../pages/ClinicianView'

const STATUS_LABEL = { difficult: 'partly finished', refused: 'refused' }

function day(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

// Facts the family logged this week, each with the entries behind it. Not a diagnosis and not advice.
export default function SessionPrepCard({ mealStatuses, mealDistress, allMealItems }) {
  const prep = useMemo(() => buildSessionPrep({
    mealStatuses, mealDistress, allMealItems,
    isoDates: getWeekIsoDates(0),
    previousIsoDates: getWeekIsoDates(-1),
  }), [mealStatuses, mealDistress, allMealItems])

  const { counts, distress } = prep
  const changeText = distress.change === null ? null
    : distress.change === 0 ? 'same as last week'
    : `${distress.change > 0 ? 'up' : 'down'} ${Math.abs(distress.change)} from last week (${distress.previousAvgPost})`

  return (
    <SectionCard>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)', marginBottom: 2 }}>Week in review</div>
      <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '0 0 14px' }}>
        What the family logged this week, for you to review. Each point lists the entries behind it.
      </p>

      <Row label="Meals logged">
        {prep.logged} of {prep.totalSlots}: {counts.okay} finished, {counts.difficult} partly finished, {counts.refused} refused, {counts.skipped} skipped.
      </Row>

      {prep.notLoggedDays.length > 0 && prep.notLoggedDays.length < 7 && (
        <Row label="Days with nothing logged">{prep.notLoggedDays.map(day).join(', ')}</Row>
      )}

      {prep.hardEntries.length > 0 && (
        <Row label="Hard meals">
          {prep.hardestMeal && <div>{prep.hardestMeal.label} had the most ({prep.hardestMeal.count}).</div>}
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {prep.hardEntries.map(e => (
              <li key={`${e.date}-${e.meal}`}>{day(e.date)}, {e.mealLabel.toLowerCase()}: {STATUS_LABEL[e.status]}</li>
            ))}
          </ul>
        </Row>
      )}

      {prep.challengeAttempts.length > 0 && (
        <Row label="Challenge foods tried">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {prep.challengeAttempts.map(a => (
              <li key={`${a.date}-${a.meal}-${a.name}`}>
                {a.name} at {a.mealLabel.toLowerCase()}, {day(a.date)}{a.status ? ` (meal: ${STATUS_LABEL[a.status] || a.status})` : ''}
              </li>
            ))}
          </ul>
        </Row>
      )}

      {distress.avgPost !== null && (
        <Row label="Distress after meals (1–5)">
          Average {distress.avgPost}{changeText ? `, ${changeText}` : ''}.
        </Row>
      )}

      {prep.logged === 0 && <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic', margin: 0 }}>Nothing logged yet this week.</p>}
    </SectionCard>
  )
}

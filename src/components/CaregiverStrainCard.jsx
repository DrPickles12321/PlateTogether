import { useMemo } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { SectionCard } from '../pages/ClinicianView'
import { strainByCaregiver, strainWord, supportWord, weekStart } from '../lib/checkins'

// How each caregiver says they are coping, week by week (roadmap F2). For the care team; the parents see only
// their own answers. Their words, no scores, and a mark when the last two weeks were both hard.
const day = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function CaregiverStrainCard() {
  const { checkins = [] } = useFirebaseData()
  const rows = useMemo(() => strainByCaregiver(checkins), [checkins])
  const names = Object.fromEntries(checkins.map(c => [c.by, c.byName]))

  return (
    <SectionCard>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)', marginBottom: 2 }}>How the parents are doing</div>
      <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '0 0 12px' }}>
        Each caregiver's own weekly answers: how they are managing, and how supported they feel. Each sees only their own.
      </p>
      {rows.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>No check-ins yet. Parents get two questions once a week on their home screen.</p>
      ) : rows.map(r => (
        <div key={r.uid} style={{ padding: '8px 0', borderTop: '1px solid var(--rule)' }}>
          <p style={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>
            {names[r.uid] || 'A caregiver'}
            {r.hardTwoWeeks && <span style={{ color: 'var(--st-refused)', fontWeight: 600 }}> · hard two weeks running</span>}
          </p>
          <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>
            {r.recent.map(c => (
              <li key={c.week}>Week of {day(weekStart(c.week))}: managing <strong style={{ color: c.strain >= 4 ? 'var(--st-refused)' : 'var(--text-dark)', fontWeight: 600 }}>{strainWord(c.strain)?.toLowerCase()}</strong>, supported {supportWord(c.support)?.toLowerCase()}</li>
            ))}
          </ul>
        </div>
      ))}
    </SectionCard>
  )
}

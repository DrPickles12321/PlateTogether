import { useMemo } from 'react'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { SectionCard } from '../pages/ClinicianView'
import { parentsInSync, lastDays } from '../lib/parentsInSync'

// Parents in sync (roadmap F3), for the clinician: who logged which meals over the last two weeks, how often
// each caregiver's meals were hard, and which home they were logged from. Counts and plain facts only.
export default function ParentsInSyncCard() {
  const { mealStatuses = {}, mealLoggedBy = {}, familyCaregivers = [] } = useFirebaseData()
  const r = useMemo(
    () => parentsInSync({ mealStatuses, mealLoggedBy, caregivers: familyCaregivers, isoDates: lastDays(14) }),
    [mealStatuses, mealLoggedBy, familyCaregivers],
  )

  return (
    <SectionCard>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)', marginBottom: 2 }}>Parents in sync</div>
      <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '0 0 12px' }}>
        Who logged meals in the last two weeks, and how they went. Facts to talk through, not a judgment of either parent.
      </p>
      {familyCaregivers.length < 2 ? (
        <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>One caregiver logs for this family. A second can join from the family's Account page.</p>
      ) : r.total === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>No meals logged in the last two weeks.</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Caregiver', r.twoHomes ? 'Home' : null, 'Meals logged', 'Of those, hard'].filter(Boolean).map(h => <th key={h} scope="col" style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {r.caregiverRows.map(c => (
                <tr key={c.uid}>
                  <th scope="row" style={{ ...td, fontWeight: 600, overflowWrap: 'anywhere' }}>{c.name}</th>
                  {r.twoHomes && <td style={td}>{c.household === 'second' ? 'Home 2' : 'Home 1'}</td>}
                  <td style={td}>{c.logged}</td>
                  <td style={td}>{c.hard}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.notes.length > 0 && (
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.55 }}>
              {r.notes.map(n => <li key={n}>{n}</li>)}
            </ul>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 8 }}>Hard means "ate some" or "didn't eat". Skipped meals aren't counted.</p>
        </>
      )}
    </SectionCard>
  )
}

const th = { textAlign: 'left', padding: '6px 8px', borderBottom: '1.5px solid var(--border-mid)', fontWeight: 700, color: 'var(--text-dark)' }
const td = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--rule)' }

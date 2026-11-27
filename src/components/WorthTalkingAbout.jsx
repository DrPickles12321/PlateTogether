import { useMemo } from 'react'
import { buildSessionPrep } from '../lib/sessionPrep'
import { getWeekIsoDates } from '../lib/insights'
import { localIsoDate } from '../lib/constants'
import { OUTCOME_META } from '../lib/outcomes'

// The top of a family's file: what is worth raising in the next session, in plain sentences, each
// with the entries behind it. Facts from the family's own logs only. Not an assessment.
const dayLabel = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const outcomeWord = status => (OUTCOME_META[status]?.label || status || '').toLowerCase()

export default function WorthTalkingAbout({ mealStatuses, mealDistress, allMealItems, parentNotes = [], sosOpen = false }) {
  const prep = useMemo(() => buildSessionPrep({
    mealStatuses, mealDistress, allMealItems,
    isoDates: getWeekIsoDates(0),
    previousIsoDates: getWeekIsoDates(-1),
    today: localIsoDate(),
  }), [mealStatuses, mealDistress, allMealItems])

  const unread = parentNotes.filter(n => n.body && !n.read_at)
  const items = []
  if (sosOpen) items.push({ warm: true, title: 'Asked for support.', text: 'The family sent a message for the care team. See it at the top of this page.' })
  if (prep.hardEntries.length) {
    items.push({
      warm: true,
      title: `${prep.hardEntries.length} hard ${prep.hardEntries.length === 1 ? 'meal' : 'meals'}.`,
      text: prep.hardEntries.map(e => `${dayLabel(e.date)} ${e.mealLabel.toLowerCase()}: ${outcomeWord(e.status)}`).join('; ') + '.',
    })
  }
  if (unread.length) items.push({ warm: false, title: `${unread.length} unread ${unread.length === 1 ? 'note' : 'notes'} from the parent.`, text: 'In the Notes tab.' })
  if (prep.challengeAttempts.length) {
    items.push({
      warm: false,
      title: 'Challenge foods tried.',
      text: prep.challengeAttempts.map(a => `${a.name} at ${a.mealLabel.toLowerCase()}, ${dayLabel(a.date)}${a.status ? ` (${outcomeWord(a.status)})` : ''}`).join('; ') + '.',
    })
  }
  if (prep.notLoggedDays.length && prep.notLoggedDays.length < 7) {
    items.push({ warm: false, title: 'Days with nothing logged.', text: prep.notLoggedDays.map(dayLabel).join(', ') + '.' })
  }
  if (prep.distress.avgPost !== null && prep.distress.change !== null && prep.distress.change !== 0) {
    items.push({ warm: prep.distress.change > 0, title: 'Distress after meals.', text: `Average ${prep.distress.avgPost} of 5, ${prep.distress.change > 0 ? 'up' : 'down'} ${Math.abs(prep.distress.change)} from last week.` })
  }

  return (
    <section aria-labelledby="worth-talking" style={{ background: 'white', border: '1px solid var(--rule)' }}>
      <div style={{ padding: '14px 18px 4px' }}>
        <h2 id="worth-talking" style={{ fontSize: 18, fontWeight: 700 }}>Worth talking about</h2>
        <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 2 }}>From the family's logs this week. Not a clinical assessment.</p>
      </div>
      {items.length === 0 ? (
        <p style={{ padding: '8px 18px 16px', fontSize: 15, color: 'var(--text-mid)' }}>
          {prep.logged ? 'Nothing stands out this week.' : 'Nothing logged yet this week.'}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: '6px 18px 14px', display: 'grid', gap: 6 }}>
          {items.map(item => (
            <li key={item.title} style={{
              display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr)', gap: 12, alignItems: 'start',
              padding: '10px 12px', background: item.warm ? 'var(--highlight)' : 'var(--ink-light)',
            }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 6, background: item.warm ? 'var(--apricot)' : 'var(--ink-mid)' }} />
              <span style={{ fontSize: 15, lineHeight: 1.5 }}><strong>{item.title}</strong> {item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

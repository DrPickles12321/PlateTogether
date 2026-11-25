// Fixed "when to get help" guidance for parents. Deliberately static: the app never judges whether something
// is serious, it only tells parents who to call. The wording mirrors the chat's crisis and urgent replies in
// lib/aiSafety.js. A clinician-editable version needs new stored data, so it waits for the storage decision.

const NOW = [
  'Fainting or collapse',
  'Chest pain',
  'Trouble breathing or a seizure',
  'Any talk of suicide or self-harm (call or text 988)',
]

const TODAY = [
  'Refusing all food and drink for a full day',
  'Making themselves throw up, or using laxatives',
  'New dizziness, feeling very cold, or a racing or fluttering heartbeat',
]

function Group({ title, tone, items }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: tone, marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5 }}>
        {items.map(i => <li key={i}>{i}</li>)}
      </ul>
    </div>
  )
}

export default function WarningSignsCard() {
  return (
    <details style={{
      background: 'white', border: '1.5px solid var(--border)', borderRadius: 14,
      padding: '0 14px', marginBottom: 12,
    }}>
      <summary style={{
        cursor: 'pointer', padding: '12px 0', minHeight: 44, fontSize: 14, fontWeight: 600,
        color: 'var(--text-dark)', display: 'flex', alignItems: 'center',
      }}>
        When to get help
      </summary>
      <div style={{ paddingBottom: 6 }}>
        <Group title="Call 911 now" tone="var(--coral)" items={NOW} />
        <Group title="Call your care team today" tone="var(--peach)" items={TODAY} />
        <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '0 0 12px', lineHeight: 1.5 }}>
          General guidance only. Your clinician's own instructions come first. This app cannot tell you
          whether something is an emergency, so if you are unsure, call.
        </p>
      </div>
    </details>
  )
}

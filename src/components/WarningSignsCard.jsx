import Icon from './Icon'

// Fixed "when to get help" guidance for parents, shown inside the Need help sheet. Deliberately
// static: the app never judges whether something is serious, it only tells parents who to call.
// The wording mirrors the chat's crisis and urgent replies in lib/aiSafety.js. A
// clinician-editable version needs new stored data, so it waits for the storage decision.

const NOW = [
  'Fainting or collapse',
  'Chest pain',
  'Trouble breathing or a seizure',
  'Any talk of suicide or self-harm',
]

const TODAY = [
  'Refusing all food and drink for a full day',
  'Making themselves throw up, or using laxatives',
  'New dizziness, feeling very cold, or a racing or fluttering heartbeat',
]

export function CallButton({ href, children, tone }) {
  return (
    <a
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '10px 14px',
        borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: 700, fontSize: 15,
        color: tone === 'urgent' ? 'white' : 'var(--ink)',
        background: tone === 'urgent' ? 'var(--danger)' : 'var(--ink-light)',
        border: tone === 'urgent' ? 'none' : '1.5px solid var(--ink-mid)',
      }}
    >
      <Icon name="phone" size={18} />
      {children}
    </a>
  )
}

function Group({ title, items }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 6 }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5 }}>
        {items.map(i => <li key={i}>{i}</li>)}
      </ul>
    </div>
  )
}

export default function WarningSignsCard() {
  return (
    <div>
      <Group title="Call 911 now if you see" items={NOW} />
      <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
        <CallButton href="tel:911" tone="urgent">Call 911</CallButton>
        <CallButton href="tel:988">Call 988 (suicide and crisis line)</CallButton>
        <CallButton href="sms:988">Text 988</CallButton>
      </div>
      <Group title="Call your care team today if you see" items={TODAY} />
      <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5 }}>
        General guidance only. Your clinician's own instructions come first. This app cannot tell
        whether something is an emergency, so if you are unsure, call.
      </p>
    </div>
  )
}

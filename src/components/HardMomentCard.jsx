import Icon from './Icon'
import { HARD_MEAL } from '../lib/supportCopy'
import { CallButton } from './WarningSignsCard'

// Answers a hard meal in place, right under the meal the parent just logged: one steady line and
// the people who can help, one tap away. It never judges the meal or gives advice.
export default function HardMomentCard({ onMessage, onHelp, onDismiss }) {
  return (
    <div
      role="status"
      className="nb-ink-settle"
      style={{
        padding: '12px 14px', borderRadius: 'var(--radius)',
        background: 'var(--ink-light)', border: '1px solid var(--ink-mid)',
      }}
    >
      <p className="font-hand" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{HARD_MEAL.title}</p>
      <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-dark)', marginBottom: 12 }}>{HARD_MEAL.body}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={onMessage} style={btn(true)}><Icon name="message" size={18} />{HARD_MEAL.messageAction}</button>
        <button onClick={onHelp} style={btn(false)}><Icon name="help" size={18} />{HARD_MEAL.helpAction}</button>
        <button onClick={onDismiss} style={{ ...btn(false), border: 'none', background: 'none', color: 'var(--text-mid)' }}>{HARD_MEAL.dismiss}</button>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '14px 0 6px' }}>{HARD_MEAL.emergency}</p>
      <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <CallButton href="tel:911" tone="urgent">Call 911</CallButton>
        <CallButton href="tel:988">Call or text 988</CallButton>
      </div>
    </div>
  )
}

function btn(primary) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '8px 14px',
    borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    border: primary ? 'none' : '1.5px solid var(--ink-mid)',
    background: primary ? 'var(--ink)' : 'white', color: primary ? 'white' : 'var(--ink)',
  }
}

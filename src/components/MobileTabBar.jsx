import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'

// A strip of notebook index tabs along the bottom edge: the word leads, a small drawn icon follows.
const TABS = [
  { to: '/parent/next',    label: 'Next meal', icon: 'clock' },
  { to: '/parent/daily',   label: 'Today',    icon: 'today' },
  { to: '/parent/weekly',  label: 'Week',     icon: 'week' },
  { to: '/parent/notes',   label: 'Notes',    icon: 'notes' },
  { to: '/parent/account', label: 'Account',  icon: 'account' },
]

export default function MobileTabBar() {
  const { pathname } = useLocation()

  return (
    <nav aria-label="Main" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
      background: 'var(--surface-warm)',
      display: 'flex', gap: 3, padding: '0 4px',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(tab => {
        const isActive = pathname === tab.to || pathname.startsWith(tab.to + '/')
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            style={{
              // Notebook index tabs: the open tab is cut from the page (same colour, no top rule),
              // the others sit behind it on their own card edge.
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 2, minHeight: 58, textDecoration: 'none',
              color: isActive ? 'var(--ink)' : 'var(--text-mid)',
              background: isActive ? 'var(--desk)' : 'white',
              borderLeft: '1px solid var(--rule-strong)', borderRight: '1px solid var(--rule-strong)', borderBottom: '1px solid var(--rule-strong)',
              borderTop: isActive ? '1px solid var(--desk)' : '1px solid var(--rule-strong)',
              borderRadius: '0 0 var(--radius) var(--radius)', marginTop: -1,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
            <Icon name={tab.icon} size={18} strokeWidth={isActive ? 2.1 : 1.75} />
          </NavLink>
        )
      })}
    </nav>
  )
}

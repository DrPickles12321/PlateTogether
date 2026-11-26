import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'

// A strip of notebook tabs along the bottom edge: drawn icon plus a readable word.
const TABS = [
  { to: '/parent/daily',   label: 'Today',    icon: 'today' },
  { to: '/parent/weekly',  label: 'Week',     icon: 'week' },
  { to: '/parent/stats',   label: 'Insights', icon: 'insights' },
  { to: '/parent/notes',   label: 'Notes',    icon: 'notes' },
  { to: '/parent/account', label: 'Account',  icon: 'account' },
]

export default function MobileTabBar() {
  const { pathname } = useLocation()

  return (
    <nav aria-label="Main" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
      background: 'white',
      borderTop: '1px solid var(--rule-strong)',
      display: 'flex',
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
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, minHeight: 58, textDecoration: 'none',
              color: isActive ? 'var(--ink)' : 'var(--text-mid)',
              borderTop: isActive ? '3px solid var(--ink)' : '3px solid transparent',
              background: isActive ? 'var(--ink-light)' : 'transparent',
              marginTop: -1,
            }}
          >
            <Icon name={tab.icon} size={22} strokeWidth={isActive ? 2.1 : 1.75} />
            <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

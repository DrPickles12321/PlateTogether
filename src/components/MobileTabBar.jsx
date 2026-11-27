import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'

// A flat bar along the bottom edge: icon over word, forest for the open tab, one hairline on top.
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
      background: 'white', borderTop: '1px solid var(--rule)',
      display: 'flex', padding: '4px 4px 0',
      paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
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
              justifyContent: 'center', gap: 2, minHeight: 52, textDecoration: 'none',
              color: isActive ? 'var(--ink)' : 'var(--text-light)',
            }}
          >
            <Icon name={tab.icon} size={22} strokeWidth={isActive ? 2.1 : 1.75} />
            <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

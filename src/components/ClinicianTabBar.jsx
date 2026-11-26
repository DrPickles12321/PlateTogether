import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'

const TABS = [
  { to: '/clinician/overview',  label: 'Overview',  icon: 'today' },
  { to: '/clinician/insights',  label: 'Insights',  icon: 'insights' },
  { to: '/clinician/care-plan', label: 'Care plan', icon: 'week' },
  { to: '/clinician/notes',     label: 'Notes',     icon: 'notes' },
]

// The family's file, tabbed like a case folder. `variant="desktop"` sits above the page;
// `variant="mobile"` is a fixed bottom bar matching the parent's. Both read one route list.
export default function ClinicianTabBar({ variant }) {
  const { pathname } = useLocation()

  if (variant === 'mobile') {
    return (
      <nav aria-label="Family file" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
        background: 'white', borderTop: '1px solid var(--rule-strong)',
        display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(tab => {
          const isActive = pathname === tab.to || pathname.startsWith(tab.to + '/')
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              aria-current={isActive ? 'page' : undefined}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, minHeight: 58, textDecoration: 'none', marginTop: -1,
                color: isActive ? 'var(--ink)' : 'var(--text-mid)',
                borderTop: isActive ? '3px solid var(--ink)' : '3px solid transparent',
                background: isActive ? 'var(--ink-light)' : 'transparent',
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

  return (
    <nav aria-label="Family file" style={{ display: 'flex', alignItems: 'flex-end', gap: 4, borderBottom: '1px solid var(--rule-strong)', marginBottom: 16 }}>
      {TABS.map(tab => {
        const isActive = pathname === tab.to || pathname.startsWith(tab.to + '/')
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '8px 16px',
              fontSize: 15, fontWeight: isActive ? 700 : 500, textDecoration: 'none',
              color: isActive ? 'var(--ink)' : 'var(--text-mid)',
              background: isActive ? 'white' : 'transparent',
              border: isActive ? '1px solid var(--rule-strong)' : '1px solid transparent',
              borderBottom: isActive ? '1px solid white' : '1px solid transparent',
              borderRadius: 'var(--radius) var(--radius) 0 0', marginBottom: -1,
            }}
          >
            <Icon name={tab.icon} size={18} />
            {tab.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

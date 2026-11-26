import { NavLink, useLocation } from 'react-router-dom'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { signOutOfApp } from '../lib/signOut'

const PARENT_TABS = [
  { to: '/parent/next',    label: 'Next meal' },
  { to: '/parent/daily',   label: 'Today' },
  { to: '/parent/weekly',  label: 'Week' },
  { to: '/parent/stats',   label: 'Insights' },
  { to: '/parent/notes',   label: 'Notes' },
  { to: '/parent/account', label: 'Account' },
]

// The notebook's cover label: the name in handwriting. On phones the parent's tabs and
// account actions live in the bottom tab bar and the Account page, so the top stays quiet.
export default function Navbar() {
  const { familyCode } = useFirebaseData()
  const { pathname } = useLocation()
  const isMobile = useIsMobile()
  const isParent = pathname.startsWith('/parent')

  return (
    <header style={{
      background: 'white',
      borderBottom: '1px solid var(--rule-strong)',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 16px' : '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, height: isMobile ? 52 : 60 }}>
          <span className="font-hand" style={{ fontWeight: 600, fontSize: isMobile ? 20 : 22, color: 'var(--ink)', lineHeight: 1 }}>
            Plate Together
          </span>

          {isParent && !isMobile && (
            <nav aria-label="Main" style={{ display: 'flex', alignItems: 'stretch', alignSelf: 'stretch', gap: 4 }}>
              {PARENT_TABS.map(tab => {
                const isActive = pathname === tab.to || pathname.startsWith(tab.to + '/')
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    aria-current={isActive ? 'page' : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '0 14px',
                      fontSize: 15, fontWeight: isActive ? 700 : 500, textDecoration: 'none',
                      color: isActive ? 'var(--ink)' : 'var(--text-mid)',
                      borderBottom: isActive ? '3px solid var(--ink)' : '3px solid transparent',
                      marginBottom: -1,
                    }}
                  >
                    {tab.label}
                  </NavLink>
                )
              })}
            </nav>
          )}

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
              {isParent && familyCode && (
                <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>
                  Family code <strong style={{ color: 'var(--text-dark)', letterSpacing: '0.08em' }}>{familyCode}</strong>
                </span>
              )}
              <button
                onClick={signOutOfApp}
                style={{
                  minHeight: 44, padding: '6px 12px', fontSize: 14, fontWeight: 600, color: 'var(--text-mid)',
                  background: 'none', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            </div>
          )}
          {isMobile && !isParent && (
            <button
              onClick={signOutOfApp}
              style={{
                minHeight: 44, padding: '6px 12px', fontSize: 14, fontWeight: 600, color: 'var(--text-mid)',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

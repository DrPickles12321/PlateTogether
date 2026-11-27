// Drawn icons in one stroke weight, replacing emoji. Decorative by default (aria-hidden);
// the control that holds an icon carries the accessible name.
const PATHS = {
  today: <><path d="M6 3.5h10l3 3V20.5H6z" /><path d="M9 9.5h7M9 13h7M9 16.5h4.5" /></>,
  week: <><rect x="3.5" y="5" width="17" height="15" rx="1.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4M9.5 9.5v10.5M14.5 9.5v10.5" /></>,
  insights: <><path d="M4 19.5h16" /><path d="M5.5 15.5l4-4.5 3.5 3 5.5-6.5" /></>,
  notes: <><path d="M15.5 4.5l4 4L9 19H5v-4z" /><path d="M13 7l4 4" /></>,
  account: <><circle cx="12" cy="8.5" r="3.75" /><path d="M4.5 20c1.2-3.6 4-5.25 7.5-5.25S18.3 16.4 19.5 20" /></>,
  help: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /><path d="M6 6l3.5 3.5M18 6l-3.5 3.5M6 18l3.5-3.5M18 18l-3.5-3.5" /></>,
  phone: <path d="M7 3.5h2.5l1.5 4-2 1.5a10 10 0 0 0 6 6l1.5-2 4 1.5V17a2 2 0 0 1-2 2A15.5 15.5 0 0 1 5 5.5a2 2 0 0 1 2-2z" />,
  message: <path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5H4.5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  left: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  right: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  tick: <path d="M5 12.5l4.5 4.5L19 7" />,
  more: <><circle cx="12" cy="5.5" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="18.5" r="1.2" /></>,
  dot: <circle cx="12" cy="12" r="4" />,
  down: <path d="M6 9.5l6 6 6-6" />,
  up: <path d="M6 14.5l6-6 6 6" />,
  repeat: <><path d="M5 11V9a3 3 0 0 1 3-3h10.5M15.5 3l3 3-3 3" /><path d="M19 13v2a3 3 0 0 1-3 3H5.5M8.5 21l-3-3 3-3" /></>,
}

export default function Icon({ name, size = 20, strokeWidth = 1.75, style, label }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}
      style={{ flexShrink: 0, display: 'block', ...style }}
    >
      {PATHS[name]}
    </svg>
  )
}

// How a meal went, as one of four marks in one ink: a full dot (ate it all), a half dot (ate
// some), an empty ring (didn't eat), a dash (not served). 'next' is the apricot "up next" ring
// and 'later' a small faint dot for meals still to come (never a ring, which means "didn't eat"). Always shown with a word nearby.
export function OutcomeMark({ mark, size = 18, color = 'currentColor' }) {
  const s = { flexShrink: 0, display: 'block' }
  const ring = { cx: 12, cy: 12, r: 7.5, strokeWidth: 2 }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={s}>
      {mark === 'all' && <circle {...ring} fill={color} stroke={color} />}
      {mark === 'some' && (
        <>
          <circle {...ring} fill="none" stroke={color} />
          <path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill={color} />
        </>
      )}
      {mark === 'none' && <circle {...ring} fill="none" stroke={color} />}
      {mark === 'skip' && <path d="M6 12h12" stroke={color} strokeWidth="2.2" strokeLinecap="round" />}
      {mark === 'next' && <circle {...ring} fill="var(--highlight)" stroke="var(--apricot)" strokeWidth="2.4" />}
      {mark === 'later' && <circle cx="12" cy="12" r="2.5" fill="var(--border-mid)" />}
    </svg>
  )
}

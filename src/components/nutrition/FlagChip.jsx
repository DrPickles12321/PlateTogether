const FLAG_CONFIG = {
  'good calcium source':   { label: 'Bone health',    color: 'bg-[var(--surface-warm)] text-[var(--text-mid)] border border-[var(--border-mid)]' },
  'iron rich':             { label: 'Iron rich',       color: 'bg-[var(--surface-warm)] text-[var(--text-mid)] border border-[var(--border-mid)]' },
  'vitamin D source':      { label: 'Vitamin D',       color: 'bg-[var(--surface-warm)] text-[var(--text-mid)] border border-[var(--border-mid)]' },
  'high energy density':   { label: 'Energy rich',     color: 'bg-[var(--surface-warm)] text-[var(--text-mid)] border border-[var(--border-mid)]' },
  'complete protein':      { label: 'Protein',         color: 'bg-[var(--surface-warm)] text-[var(--text-mid)] border border-[var(--border-mid)]' },
  'contains healthy fats': { label: 'Healthy fats',    color: 'bg-[var(--surface-warm)] text-[var(--text-mid)] border border-[var(--border-mid)]' },
  'high fiber':            { label: 'High fiber',      color: 'bg-[var(--surface-warm)] text-[var(--text-mid)] border border-[var(--border-mid)]' },
}

export { FLAG_CONFIG }

export default function FlagChip({ flag }) {
  const cfg = FLAG_CONFIG[flag]
  if (!cfg) return null
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

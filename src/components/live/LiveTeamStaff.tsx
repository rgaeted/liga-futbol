type StaffBadgeProps = {
  role: 'C' | 'DT'
  label: string
  compact?: boolean
  tone?: 'default' | 'premium'
}

const BADGE_STYLES = {
  C: {
    border: 'border-sky-400/25',
    bg: 'bg-gradient-to-r from-sky-500/15 to-sky-400/5',
    text: 'text-sky-100/95',
    chip: 'bg-sky-400/25 text-sky-200',
  },
  DT: {
    border: 'border-amber-400/30',
    bg: 'bg-gradient-to-r from-amber-500/20 to-amber-400/5',
    text: 'text-amber-50/95',
    chip: 'bg-amber-400/25 text-amber-200',
  },
} as const

function StaffBadge({ role, label, compact = false, tone = 'default' }: StaffBadgeProps) {
  if (tone === 'premium') {
    const premium =
      role === 'C'
        ? 'bg-[#1e3a8a] text-white'
        : 'bg-[#d4af37] text-[#1a1204]'
    return (
      <span
        className={`inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[10px] font-semibold tracking-wide ${premium} ${
          compact ? 'py-0.5 pl-0.5 pr-2 text-[9px]' : ''
        }`}
      >
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-full font-ui font-bold uppercase ${
            role === 'C'
              ? 'h-5 w-5 bg-white text-[#1e3a8a]'
              : 'h-5 min-w-5 px-0.5 bg-[#1a1204] text-[#f5e6b8]'
          } ${compact ? 'h-4 w-4 text-[8px]' : 'text-[9px]'}`}
        >
          {role}
        </span>
        <span className="truncate">{label}</span>
      </span>
    )
  }

  const styles = BADGE_STYLES[role]
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border ${styles.border} ${styles.bg} font-medium tracking-wide ${styles.text} ${
        compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
      }`}
    >
      <span
        className={`shrink-0 rounded font-ui font-bold uppercase ${styles.chip} ${
          compact ? 'px-1 py-px text-[8px]' : 'px-1 py-px text-[9px]'
        }`}
      >
        {role}
      </span>
      <span className="truncate">{label}</span>
    </span>
  )
}

export function LiveTeamStaff({
  captainLabel,
  coachLabel,
  compact = false,
  tone = 'default',
}: {
  captainLabel?: string | null
  coachLabel?: string | null
  compact?: boolean
  tone?: 'default' | 'premium'
}) {
  if (!captainLabel && !coachLabel) return null

  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {captainLabel && <StaffBadge role="C" label={captainLabel} compact={compact} tone={tone} />}
      {coachLabel && <StaffBadge role="DT" label={coachLabel} compact={compact} tone={tone} />}
    </div>
  )
}

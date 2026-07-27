type StaffBadgeProps = {
  role: 'C' | 'DT'
  label: string
  compact?: boolean
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

function StaffBadge({ role, label, compact = false }: StaffBadgeProps) {
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
}: {
  captainLabel?: string | null
  coachLabel?: string | null
  compact?: boolean
}) {
  if (!captainLabel && !coachLabel) return null

  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {captainLabel && <StaffBadge role="C" label={captainLabel} compact={compact} />}
      {coachLabel && <StaffBadge role="DT" label={coachLabel} compact={compact} />}
    </div>
  )
}

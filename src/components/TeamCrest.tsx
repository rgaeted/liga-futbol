import { teamInitials } from '@/lib/player-name'
import { contrastTextColor } from '@/lib/team-color'

type Props = {
  name: string
  src?: string | null
  color?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  sm: 36,
  md: 48,
  lg: 64,
} as const

const TEXT_CLASS = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
} as const

function GeneratedShield({
  name,
  color,
  size,
  className,
}: {
  name: string
  color: string
  size: 'sm' | 'md' | 'lg'
  className: string
}) {
  const dim = SIZE[size]
  const textColor = contrastTextColor(color)
  const label = teamInitials(name)

  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 64 72"
      className={`drop-shadow-md ${className}`}
      aria-hidden
    >
      <path
        d="M32 3 58 13v25c0 16.5-11 29.5-26 34-15-4.5-26-17.5-26-34V13L32 3z"
        fill={color}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2"
      />
      <text
        x="32"
        y="40"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        className={`font-display font-bold ${TEXT_CLASS[size]}`}
        style={{ fontSize: size === 'lg' ? 18 : size === 'md' ? 14 : 11 }}
      >
        {label}
      </text>
    </svg>
  )
}

export function TeamCrest({ name, src, color, size = 'md', className = '' }: Props) {
  if (src) {
    const dimClass =
      size === 'lg' ? 'h-16 w-16' : size === 'md' ? 'h-12 w-12' : 'h-9 w-9'
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Escudo ${name}`}
        className={`${dimClass} rounded-full object-cover ring-2 ring-white/15 ${className}`}
      />
    )
  }

  if (color) {
    return <GeneratedShield name={name} color={color} size={size} className={className} />
  }

  const dimClass =
    size === 'lg' ? 'h-16 w-16 text-base' : size === 'md' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs'

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-white/10 font-semibold uppercase text-white/80 ring-2 ring-white/15 ${dimClass} ${className}`}
      aria-hidden
    >
      {teamInitials(name)}
    </span>
  )
}

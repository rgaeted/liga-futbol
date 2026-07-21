type Props = {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const SIZE_CLASS = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base',
} as const

export function TeamCrest({ name, src, size = 'md', className = '' }: Props) {
  const dimClass = SIZE_CLASS[size]

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Escudo ${name}`}
        className={`${dimClass} rounded-full object-cover ring-2 ring-white/15 ${className}`}
      />
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-white/10 font-semibold uppercase text-white/80 ring-2 ring-white/15 ${dimClass} ${className}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

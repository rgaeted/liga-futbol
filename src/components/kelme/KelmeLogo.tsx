import Link from 'next/link'

type Props = {
  size?: 'sm' | 'md' | 'lg'
  showSubtitle?: boolean
  variant?: 'light' | 'dark'
}

export function KelmeLogo({ size = 'md', showSubtitle = true, variant = 'light' }: Props) {
  const iconSize = size === 'sm' ? 32 : size === 'lg' ? 48 : 40
  const markColor = variant === 'dark' ? '#FFFFFF' : '#000000'
  const textColor = variant === 'dark' ? '#FFFFFF' : '#000000'
  const subtitleColor = variant === 'dark' ? '#707070' : '#54595F'

  return (
    <Link href="/" className="flex items-center gap-3">
      <svg viewBox="0 0 120 120" width={iconSize} height={iconSize} aria-hidden>
        <rect x="8" y="8" width="104" height="104" rx="20" fill="none" stroke={markColor} strokeWidth="2.5" />
        <path
          d="M38 72 C38 48, 52 34, 72 34 C88 34, 96 44, 96 56 C96 68, 86 78, 68 82 L58 88 L48 82 C40 78, 38 74, 38 72 Z"
          fill="none"
          stroke={markColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="78" cy="52" r="4" fill={markColor} />
      </svg>
      <div>
        <div
          className="font-display font-extrabold uppercase leading-none tracking-wide"
          style={{ color: textColor, fontSize: size === 'sm' ? '14px' : size === 'lg' ? '22px' : '18px' }}
        >
          KELME
        </div>
        {showSubtitle && (
          <div
            className="font-ui font-medium uppercase tracking-widest"
            style={{ color: subtitleColor, fontSize: size === 'sm' ? '9px' : '10px', marginTop: '2px' }}
          >
            Torneos Kelme
          </div>
        )}
      </div>
    </Link>
  )
}

import { friendlyPlayerPhotoUrl } from '@/lib/friendly-player-photo'

type Props = {
  id: string
  firstName: string
  lastName: string
  hasPhoto: boolean
  size?: 'sm' | 'md'
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function FriendlyPlayerAvatar({
  id,
  firstName,
  lastName,
  hasPhoto,
  size = 'sm',
}: Props) {
  const dim = size === 'md' ? 48 : 36
  const textClass = size === 'md' ? 'text-sm' : 'text-xs'

  if (hasPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={friendlyPlayerPhotoUrl(id)}
        alt={`${firstName} ${lastName}`}
        width={dim}
        height={dim}
        className="rounded-full object-cover ring-1 ring-kelme-border"
      />
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-kelme-gray-100 font-semibold text-kelme-gray-600 ring-1 ring-kelme-border ${textClass}`}
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      {initials(firstName, lastName)}
    </span>
  )
}

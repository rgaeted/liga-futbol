import Link from 'next/link'
import type { MatchStatus } from '@prisma/client'
import { canViewMatchLive, matchLiveLinkLabel } from '@/lib/match-player-links'
import { orgPath } from '@/lib/tenant-paths'

export function MatchLiveLink({
  organizationSlug,
  matchId,
  status,
  className = 'text-xs text-kelme-red hover:underline',
}: {
  organizationSlug: string
  matchId: string
  status: MatchStatus
  className?: string
}) {
  if (!canViewMatchLive(status)) return null

  return (
    <Link href={orgPath(organizationSlug, `/live/${matchId}`)} className={className}>
      {matchLiveLinkLabel(status)}
    </Link>
  )
}

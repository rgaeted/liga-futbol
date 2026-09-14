import type { MatchStatus } from '@prisma/client'
import { orgPath } from '@/lib/tenant-paths'

export type RefereePanelViewer = 'self' | 'admin'

export function refereeMatchLinkHref(
  organizationSlug: string,
  matchId: string,
  status: MatchStatus,
  viewer: RefereePanelViewer,
): string {
  if (viewer === 'self') {
    return orgPath(organizationSlug, `/referee/match/${matchId}`)
  }
  if (status === 'LIVE' || status === 'HALFTIME' || status === 'FINISHED') {
    return orgPath(organizationSlug, `/live/${matchId}`)
  }
  return orgPath(organizationSlug, '/admin/matches')
}

export function refereeUpcomingActionLabel(viewer: RefereePanelViewer, status: MatchStatus): string {
  if (viewer === 'self') return 'Gestionar partido →'
  if (status === 'LIVE' || status === 'HALFTIME') return 'Ver en vivo →'
  if (status === 'FINISHED') return 'Ver cronología →'
  return 'Ver en admin →'
}

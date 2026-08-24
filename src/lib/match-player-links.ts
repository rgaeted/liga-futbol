import type { MatchStatus } from '@prisma/client'

export function canViewMatchLive(status: MatchStatus): boolean {
  return status === 'FINISHED' || status === 'LIVE' || status === 'HALFTIME'
}

export function matchLiveLinkLabel(status: MatchStatus): string {
  if (status === 'LIVE' || status === 'HALFTIME') return 'EN VIVO'
  return 'Ver partido'
}

export function isMatchFormationReadOnly(status: MatchStatus): boolean {
  return status === 'FINISHED' || status === 'CANCELLED'
}

export function friendlyLineupLinkLabel(status: MatchStatus): string {
  return isMatchFormationReadOnly(status) ? 'Ver formación' : 'Editar formación'
}

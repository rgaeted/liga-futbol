import { ChallengeStatus, MatchType } from '@prisma/client'

export type ChallengeMatch = {
  organizationId: string
  guestOrganizationId: string | null
  challengeStatus: ChallengeStatus
  matchType: MatchType
}

export function assertChallengeCreate({
  hostOrganizationId,
  guestOrganizationId,
}: {
  hostOrganizationId: string
  guestOrganizationId: string
}) {
  if (hostOrganizationId === guestOrganizationId) {
    throw new Error('No puedes desafiar a la misma organización')
  }
}

export function assertCanEditFriendlySide({
  actorOrganizationId,
  match,
  side,
}: {
  actorOrganizationId: string
  match: ChallengeMatch
  side: 'A' | 'B'
}): boolean {
  if (match.matchType !== MatchType.FRIENDLY) {
    return actorOrganizationId === match.organizationId
  }

  if (!match.guestOrganizationId) {
    return actorOrganizationId === match.organizationId
  }

  if (match.challengeStatus === ChallengeStatus.PENDING && side === 'B') {
    return false
  }

  if (side === 'A') {
    return actorOrganizationId === match.organizationId
  }

  return (
    actorOrganizationId === match.guestOrganizationId &&
    match.challengeStatus === ChallengeStatus.ACCEPTED
  )
}

export function computeFriendlySideReady(
  players: Array<{ side: 'A' | 'B'; isCaptain: boolean; isCoach: boolean }>
): { sideAReady: boolean; sideBReady: boolean } {
  function sideReady(side: 'A' | 'B') {
    const sidePlayers = players.filter((player) => player.side === side)
    if (sidePlayers.length < 1) return false
    if (sidePlayers.filter((player) => player.isCaptain).length !== 1) return false
    if (sidePlayers.filter((player) => player.isCoach).length !== 1) return false
    return true
  }

  return { sideAReady: sideReady('A'), sideBReady: sideReady('B') }
}

export function assertCanGoLive({
  matchType,
  challengeStatus,
  sideAReady,
  sideBReady,
}: {
  matchType: MatchType
  challengeStatus: ChallengeStatus
  sideAReady: boolean
  sideBReady: boolean
}): { ok: true } | { ok: false; error: string } {
  if (matchType !== MatchType.FRIENDLY) {
    return { ok: true }
  }

  if (challengeStatus === ChallengeStatus.PENDING) {
    return { ok: false, error: 'El desafío todavía no fue aceptado' }
  }

  if (!sideAReady || !sideBReady) {
    return {
      ok: false,
      error: 'Ambos lados deben tener capitán, DT y al menos un jugador',
    }
  }

  return { ok: true }
}

export type ChallengeAction = 'accept' | 'decline' | 'cancel'

export function nextChallengeStatus(
  action: ChallengeAction,
  current: ChallengeStatus
): ChallengeStatus {
  if (current !== ChallengeStatus.PENDING) {
    throw new Error('Solo se puede cambiar un desafío pendiente')
  }

  switch (action) {
    case 'accept':
      return ChallengeStatus.ACCEPTED
    case 'decline':
      return ChallengeStatus.DECLINED
    case 'cancel':
      return ChallengeStatus.CANCELLED
  }
}

export function isChallengeParticipant(
  match: { organizationId: string; guestOrganizationId: string | null },
  organizationId: string
): boolean {
  return (
    match.organizationId === organizationId ||
    match.guestOrganizationId === organizationId
  )
}

export function isChallengeHost(
  match: { organizationId: string },
  organizationId: string
): boolean {
  return match.organizationId === organizationId
}

export function isChallengeGuest(
  match: { guestOrganizationId: string | null },
  organizationId: string
): boolean {
  return match.guestOrganizationId === organizationId
}

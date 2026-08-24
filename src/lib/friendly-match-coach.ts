import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { splitPersonName } from '@/lib/person-name'
import { syncPlayerDerivedMemberships } from '@/lib/player-memberships'
import type { FriendlySide } from '@prisma/client'
import type { FriendlyRosterEntry } from '@/lib/friendly-match-captain'

const friendlyCoachMatchInclude = {
  match: {
    select: {
      id: true,
      matchType: true,
      sideAName: true,
      sideBName: true,
      scheduledAt: true,
      status: true,
      footballFormat: true,
      venue: true,
    },
  },
} as const

function unlinkedPersonNameFilter(name: string) {
  const { firstName, lastName } = splitPersonName(name)
  return {
    userId: null as null,
    firstName: { equals: firstName, mode: 'insensitive' as const },
    ...(lastName ? { lastName: { equals: lastName, mode: 'insensitive' as const } } : {}),
  }
}

/** Partidos amistosos visibles en el tenant (anfitrión o visitante en desafíos). */
export function friendlyCoachMatchesForOrgWhere(organizationId: string) {
  return {
    matchType: 'FRIENDLY' as const,
    OR: [{ organizationId }, { guestOrganizationId: organizationId }],
  }
}

/** Player ids del usuario como DT (puede ser ficha de otra org en desafíos cross-org). */
export async function coachPlayerIdsForUser(
  userId: string,
  organizationId: string,
  options?: { autoLink?: boolean },
): Promise<string[]> {
  const linked = await db.player.findMany({
    where: { person: { userId } },
    select: { id: true },
  })
  if (linked.length > 0) return linked.map((p) => p.id)

  const membership = await db.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { roles: true },
  })
  if (!membership?.roles.includes(MembershipRole.FRIENDLY_COACH)) return []

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, person: { select: { id: true } } },
  })
  if (!user) return []

  const candidates = await db.player.findMany({
    where: {
      person: unlinkedPersonNameFilter(user.name),
      friendlyParticipations: { some: { isCoach: true } },
    },
    select: { id: true, personId: true },
  })

  if (
    options?.autoLink &&
    candidates.length === 1 &&
    !user.person
  ) {
    await db.person.update({
      where: { id: candidates[0].personId },
      data: { userId },
    })
    await syncPlayerDerivedMemberships(userId)
  }

  return candidates.map((p) => p.id)
}

export function validateFriendlyCoaches(players: FriendlyRosterEntry[]): string | null {
  for (const side of ['A', 'B'] as const) {
    const coaches = players.filter((p) => p.side === side && p.isCoach)
    if (coaches.length !== 1) {
      return side === 'A'
        ? 'Debes elegir un DT para el equipo local (lado A)'
        : 'Debes elegir un DT para el equipo visitante (lado B)'
    }
  }
  return null
}

export function coachesFromRoster(players: FriendlyRosterEntry[]): {
  sideACoachId: string | null
  sideBCoachId: string | null
} {
  let sideACoachId: string | null = null
  let sideBCoachId: string | null = null
  for (const p of players) {
    if (!p.isCoach) continue
    if (p.side === 'A') sideACoachId = p.playerId
    else sideBCoachId = p.playerId
  }
  return { sideACoachId, sideBCoachId }
}

export async function friendlyCoachSideForUser(
  userId: string,
  matchId: string,
  organizationId: string,
): Promise<FriendlySide | null> {
  const playerIds = await coachPlayerIdsForUser(userId, organizationId)
  if (playerIds.length === 0) return null

  const participation = await db.friendlyMatchPlayer.findFirst({
    where: {
      matchId,
      playerId: { in: playerIds },
      isCoach: true,
    },
    select: { side: true },
  })

  return participation?.side ?? null
}

export type FriendlyCoachView = {
  side: 'A' | 'B'
  playerId: string
  label: string
}

export function resolveFriendlyCoaches(
  participations: Array<{
    playerId: string
    side: 'A' | 'B'
    isCoach: boolean
    player: { person: { firstName: string; lastName: string; user: { name: string } | null } }
  }>
): FriendlyCoachView[] {
  return participations
    .filter((p) => p.isCoach)
    .map((p) => ({
      side: p.side,
      playerId: p.playerId,
      label: `${p.player.person.firstName} ${p.player.person.lastName}`.trim(),
    }))
}

export async function listFriendlyCoachMatchesForUser(userId: string, organizationId: string) {
  const playerIds = await coachPlayerIdsForUser(userId, organizationId, { autoLink: true })
  if (playerIds.length === 0) return []

  return db.friendlyMatchPlayer.findMany({
    where: {
      playerId: { in: playerIds },
      isCoach: true,
      match: friendlyCoachMatchesForOrgWhere(organizationId),
    },
    include: friendlyCoachMatchInclude,
    orderBy: { match: { scheduledAt: 'desc' } },
  })
}
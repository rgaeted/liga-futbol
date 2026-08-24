import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { mergeMembershipRole } from '@/lib/membership-roles'

async function playerOrganizationIdsForUser(userId: string): Promise<string[]> {
  const players = await db.player.findMany({
    where: { person: { userId } },
    select: { organizationId: true },
    distinct: ['organizationId'],
  })
  return players.map((player) => player.organizationId)
}

async function friendlyCoachOrganizationIdsForUser(userId: string): Promise<string[]> {
  const players = await db.player.findMany({
    where: {
      person: { userId },
      friendlyParticipations: { some: { isCoach: true } },
    },
    select: { organizationId: true },
    distinct: ['organizationId'],
  })
  return players.map((player) => player.organizationId)
}

/**
 * Alinea memberships con fichas de jugador y designaciones DT en roster.
 * Idempotente: seguro llamar en cada login o al enlazar una ficha.
 */
export async function syncPlayerDerivedMemberships(userId: string): Promise<void> {
  for (const organizationId of await playerOrganizationIdsForUser(userId)) {
    await mergeMembershipRole(userId, organizationId, MembershipRole.PLAYER)
  }

  for (const organizationId of await friendlyCoachOrganizationIdsForUser(userId)) {
    await mergeMembershipRole(userId, organizationId, MembershipRole.FRIENDLY_COACH)
  }
}

/** @deprecated Use syncPlayerDerivedMemberships */
export async function ensurePlayerMembershipsForUser(userId: string): Promise<void> {
  await syncPlayerDerivedMemberships(userId)
}

export async function friendlyParticipationCountByOrg(
  userId: string,
): Promise<Record<string, number>> {
  const rows = await db.friendlyMatchPlayer.findMany({
    where: { player: { person: { userId } } },
    select: {
      player: {
        select: { organization: { select: { slug: true } } },
      },
    },
  })

  const counts: Record<string, number> = {}
  for (const row of rows) {
    const slug = row.player.organization.slug
    counts[slug] = (counts[slug] ?? 0) + 1
  }
  return counts
}

export async function syncAllPlayerDerivedMemberships(): Promise<{ users: number }> {
  const people = await db.person.findMany({
    where: { userId: { not: null } },
    select: { userId: true },
    distinct: ['userId'],
  })

  const userIds = people
    .map((person) => person.userId)
    .filter((userId): userId is string => userId != null)

  for (const userId of userIds) {
    await syncPlayerDerivedMemberships(userId)
  }

  return { users: userIds.length }
}

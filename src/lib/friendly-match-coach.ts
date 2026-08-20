import { db } from '@/lib/db'
import type { FriendlySide } from '@prisma/client'
import type { FriendlyRosterEntry } from '@/lib/friendly-match-captain'

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
  const profile = await db.player.findFirst({
    where: { organizationId, person: { userId } },
    select: { id: true },
  })
  if (!profile) return null

  const participation = await db.friendlyMatchPlayer.findFirst({
    where: {
      matchId,
      playerId: profile.id,
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
  const profile = await db.player.findFirst({
    where: { organizationId, person: { userId } },
    select: { id: true },
  })
  if (!profile) return []

  return db.friendlyMatchPlayer.findMany({
    where: {
      playerId: profile.id,
      isCoach: true,
      match: { matchType: 'FRIENDLY' },
    },
    include: {
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
    },
    orderBy: { match: { scheduledAt: 'desc' } },
  })
}

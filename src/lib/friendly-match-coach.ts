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
    if (p.side === 'A') sideACoachId = p.friendlyPlayerId
    else sideBCoachId = p.friendlyPlayerId
  }
  return { sideACoachId, sideBCoachId }
}

export async function friendlyCoachSideForUser(
  userId: string,
  matchId: string
): Promise<FriendlySide | null> {
  const profile = await db.friendlyPlayer.findFirst({
    where: { person: { userId } },
    select: { id: true },
  })
  if (!profile) return null

  const participation = await db.friendlyMatchPlayer.findFirst({
    where: {
      matchId,
      friendlyPlayerId: profile.id,
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
    friendlyPlayerId: string
    side: 'A' | 'B'
    isCoach: boolean
    friendlyPlayer: { firstName: string; lastName: string }
  }>
): FriendlyCoachView[] {
  return participations
    .filter((p) => p.isCoach)
    .map((p) => ({
      side: p.side,
      playerId: p.friendlyPlayerId,
      label: `${p.friendlyPlayer.firstName} ${p.friendlyPlayer.lastName}`.trim(),
    }))
}

export async function listFriendlyCoachMatchesForUser(userId: string) {
  const profile = await db.friendlyPlayer.findFirst({
    where: { person: { userId } },
    select: { id: true },
  })
  if (!profile) return []

  return db.friendlyMatchPlayer.findMany({
    where: { friendlyPlayerId: profile.id, isCoach: true },
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

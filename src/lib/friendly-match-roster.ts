import type { Prisma } from '@prisma/client'
import { validateFriendlyCaptains, type FriendlyRosterEntry } from '@/lib/friendly-match-captain'
import { validateFriendlyCoaches } from '@/lib/friendly-match-coach'

export type { FriendlyRosterEntry } from '@/lib/friendly-match-captain'

export function validateFriendlyRoster(players: FriendlyRosterEntry[]): string | null {
  const sides = new Set(players.map((p) => p.side))
  if (!sides.has('A') || !sides.has('B')) {
    return 'Debe haber al menos un jugador por lado'
  }
  const ids = players.map((p) => p.friendlyPlayerId)
  if (new Set(ids).size !== ids.length) {
    return 'Un jugador no puede estar dos veces en el mismo partido'
  }
  return validateFriendlyCaptains(players) ?? validateFriendlyCoaches(players)
}

export async function syncFriendlyMatchRoster(
  tx: Prisma.TransactionClient,
  matchId: string,
  players: FriendlyRosterEntry[]
) {
  const existing = await tx.friendlyMatchPlayer.findMany({ where: { matchId } })
  const existingByPlayer = new Map(existing.map((p) => [p.friendlyPlayerId, p]))
  const incomingIds = new Set(players.map((p) => p.friendlyPlayerId))

  for (const row of existing) {
    if (!incomingIds.has(row.friendlyPlayerId)) {
      await tx.friendlyMatchPlayer.delete({ where: { id: row.id } })
    }
  }

  for (const entry of players) {
    const prev = existingByPlayer.get(entry.friendlyPlayerId)
    const isCaptain = entry.isCaptain ?? false
    const isCoach = entry.isCoach ?? false

    if (!prev) {
      await tx.friendlyMatchPlayer.create({
        data: {
          matchId,
          friendlyPlayerId: entry.friendlyPlayerId,
          side: entry.side,
          isCaptain,
          isCoach,
        },
      })
      continue
    }

    if (prev.side !== entry.side) {
      await tx.friendlyMatchPlayer.update({
        where: { id: prev.id },
        data: {
          side: entry.side,
          slotKey: null,
          isStarter: false,
          isCaptain,
          isCoach,
        },
      })
      await tx.matchEvent.updateMany({
        where: { matchId, friendlyPlayerId: entry.friendlyPlayerId },
        data: { side: entry.side },
      })
      continue
    }

    if (prev.isCaptain !== isCaptain || prev.isCoach !== isCoach) {
      await tx.friendlyMatchPlayer.update({
        where: { id: prev.id },
        data: { isCaptain, isCoach },
      })
    }
  }

  await tx.friendlyMatchPlayer.updateMany({
    where: { matchId, isCaptain: true },
    data: { isCaptain: false },
  })

  for (const entry of players.filter((p) => p.isCaptain)) {
    await tx.friendlyMatchPlayer.updateMany({
      where: {
        matchId,
        friendlyPlayerId: entry.friendlyPlayerId,
        side: entry.side,
      },
      data: { isCaptain: true },
    })
  }

  await tx.friendlyMatchPlayer.updateMany({
    where: { matchId, isCoach: true },
    data: { isCoach: false },
  })

  for (const entry of players.filter((p) => p.isCoach)) {
    await tx.friendlyMatchPlayer.updateMany({
      where: {
        matchId,
        friendlyPlayerId: entry.friendlyPlayerId,
        side: entry.side,
      },
      data: { isCoach: true },
    })
  }
}

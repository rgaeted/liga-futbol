import { db } from '@/lib/db'

const friendlyParticipationInclude = {
  match: {
    select: {
      id: true,
      matchType: true,
      sideAName: true,
      sideBName: true,
      scheduledAt: true,
      status: true,
      homeScore: true,
      awayScore: true,
      footballFormat: true,
      venue: true,
    },
  },
} as const

export async function listFriendlyParticipationsForPlayerInOrg(
  userId: string,
  organizationId: string,
) {
  return db.friendlyMatchPlayer.findMany({
    where: {
      player: {
        organizationId,
        person: { userId },
      },
    },
    include: friendlyParticipationInclude,
    orderBy: { match: { scheduledAt: 'desc' } },
  })
}

export async function listFriendlyParticipationsForPlayerId(playerId: string) {
  return db.friendlyMatchPlayer.findMany({
    where: { playerId },
    include: friendlyParticipationInclude,
    orderBy: { match: { scheduledAt: 'desc' } },
  })
}

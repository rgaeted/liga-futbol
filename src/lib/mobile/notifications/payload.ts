import { NotificationKind } from '@prisma/client'
import type { MatchNotificationContext, MatchNotificationPayload } from '@/lib/mobile/notifications/types'

function pushKind(kind: NotificationKind): MatchNotificationPayload['data']['kind'] {
  if (kind === NotificationKind.MATCH_START) return 'MATCH_START'
  if (kind === NotificationKind.MATCH_FINISH) return 'MATCH_FINISH'
  return 'GOAL'
}

export function buildMatchNotificationPayload(
  kind: NotificationKind,
  context: MatchNotificationContext,
): MatchNotificationPayload {
  const data = {
    type: 'match' as const,
    slug: context.slug,
    matchId: context.matchId,
    kind: pushKind(kind),
    path: `/matches/${context.matchId}`,
  }

  if (kind === NotificationKind.MATCH_START) {
    return {
      title: '¡Arrancó el partido!',
      body: `${context.homeName} vs ${context.awayName}`,
      data,
    }
  }

  if (kind === NotificationKind.GOAL) {
    const scoreLine = `${context.homeName} ${context.homeScore}-${context.awayScore} ${context.awayName}`
    const body = context.scorerName ? `${context.scorerName} anotó. ${scoreLine}` : scoreLine
    return {
      title: '¡Gol!',
      body,
      data,
    }
  }

  return {
    title: 'Final del partido',
    body: `${context.homeName} ${context.homeScore}-${context.awayScore} ${context.awayName}`,
    data,
  }
}

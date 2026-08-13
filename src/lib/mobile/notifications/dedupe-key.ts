import { NotificationKind } from '@prisma/client'
import type { BuildNotificationDedupeKeyInput } from '@/lib/mobile/notifications/types'

export function buildNotificationDedupeKey(input: BuildNotificationDedupeKeyInput): string {
  if (input.kind === NotificationKind.GOAL) {
    if (!input.matchEventId) {
      throw new Error('matchEventId is required for GOAL notifications')
    }
    return `goal:${input.seasonId}:${input.matchId}:${input.matchEventId}`
  }

  if (input.kind === NotificationKind.MATCH_START) {
    return `start:${input.seasonId}:${input.matchId}`
  }

  if (input.kind === NotificationKind.MATCH_FINISH) {
    return `finish:${input.seasonId}:${input.matchId}`
  }

  throw new Error(`Unsupported notification kind: ${input.kind}`)
}

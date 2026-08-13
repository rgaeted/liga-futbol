import { NotificationKind } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { buildNotificationDedupeKey } from '@/lib/mobile/notifications/dedupe-key'

describe('buildNotificationDedupeKey', () => {
  it('builds start keys from season, match and kind', () => {
    expect(
      buildNotificationDedupeKey({
        seasonId: 'season-1',
        matchId: 'match-1',
        kind: NotificationKind.MATCH_START,
      }),
    ).toBe('start:season-1:match-1')
  })

  it('builds final keys from season, match and kind', () => {
    expect(
      buildNotificationDedupeKey({
        seasonId: 'season-1',
        matchId: 'match-1',
        kind: NotificationKind.MATCH_FINISH,
      }),
    ).toBe('finish:season-1:match-1')
  })

  it('requires matchEventId for goal keys', () => {
    expect(() =>
      buildNotificationDedupeKey({
        seasonId: 'season-1',
        matchId: 'match-1',
        kind: NotificationKind.GOAL,
      }),
    ).toThrow('matchEventId is required for GOAL notifications')
  })

  it('builds goal keys with matchEventId', () => {
    expect(
      buildNotificationDedupeKey({
        seasonId: 'season-1',
        matchId: 'match-1',
        kind: NotificationKind.GOAL,
        matchEventId: 'event-1',
      }),
    ).toBe('goal:season-1:match-1:event-1')
  })
})

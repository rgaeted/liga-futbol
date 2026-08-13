import * as Notifications from 'expo-notifications'
import { describe, expect, it, vi } from 'vitest'
import {
  attachNotificationResponseListener,
  resolveNotificationPath,
} from '../../src/notifications/listeners'

describe('resolveNotificationPath', () => {
  const leagueSlug = 'liga-invierno-kelme-puerto-varas-2026'

  it('opens match detail for valid match notifications', () => {
    expect(
      resolveNotificationPath(
        {
          type: 'match',
          slug: leagueSlug,
          matchId: 'm1',
          kind: 'GOAL',
          path: '/matches/m1',
        },
        leagueSlug,
      ),
    ).toBe('/(tabs)/matches/m1')
  })

  it('opens home for unknown notification shape', () => {
    expect(resolveNotificationPath(null, leagueSlug)).toBe('/(tabs)')
    expect(
      resolveNotificationPath(
        {
          type: 'match',
          slug: leagueSlug,
          matchId: 'm1',
          kind: 'GOAL',
          path: '/unknown',
        },
        leagueSlug,
      ),
    ).toBe('/(tabs)')
  })

  it('ignores notifications for another edition slug', () => {
    expect(
      resolveNotificationPath(
        {
          type: 'match',
          slug: 'otra-liga',
          matchId: 'm1',
          kind: 'MATCH_START',
          path: '/matches/m1',
        },
        leagueSlug,
      ),
    ).toBe('/(tabs)')
  })
})

describe('attachNotificationResponseListener', () => {
  it('routes notification taps through the navigation handler', () => {
    const remove = vi.fn()
    let listener: ((response: unknown) => void) | undefined
    vi.spyOn(Notifications, 'addNotificationResponseReceivedListener').mockImplementation(
      (callback) => {
        listener = callback as (response: unknown) => void
        return { remove } as never
      },
    )

    const onNavigate = vi.fn()
    const cleanup = attachNotificationResponseListener(onNavigate)

    listener?.({
      notification: {
        request: {
          content: {
            data: {
              type: 'match',
              slug: 'liga-invierno-kelme-puerto-varas-2026',
              matchId: 'm1',
              kind: 'GOAL',
              path: '/matches/m1',
            },
          },
        },
      },
    })

    expect(onNavigate).toHaveBeenCalledWith('/(tabs)/matches/m1')
    cleanup()
    expect(remove).toHaveBeenCalled()
  })
})

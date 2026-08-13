import AsyncStorage from '@react-native-async-storage/async-storage'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  replaceSubscriptions: vi.fn(),
  getOrCreateInstallationId: vi.fn(),
}))

vi.mock('../../src/api/installation-client', () => ({
  installationApiClient: {
    replaceSubscriptions: mocks.replaceSubscriptions,
  },
}))

vi.mock('../../src/notifications/installation-id', () => ({
  getOrCreateInstallationId: mocks.getOrCreateInstallationId,
}))

import {
  isSubscriptionsSyncPending,
  syncFavoriteTeamSubscriptions,
  syncPendingSubscriptionsIfNeeded,
} from '../../src/notifications/sync-subscriptions'
import { STORAGE_KEYS } from '../../src/storage/keys'
import { toggleFavoriteTeam } from '../../src/storage/favorites'

describe('syncFavoriteTeamSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOrCreateInstallationId.mockResolvedValue('11111111-1111-4111-8111-111111111111')
  })

  it('sends the complete favorite list after a local mutation', async () => {
    const store = new Map<string, string>()
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => store.get(key) ?? null)
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      store.set(key, value)
    })
    vi.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => {
      store.delete(key)
    })

    await toggleFavoriteTeam('st-1')
    await toggleFavoriteTeam('st-2')
    mocks.replaceSubscriptions.mockResolvedValue({
      teams: [
        { seasonTeamId: 'st-1', notifyMatchStart: true, notifyGoals: true, notifyFinal: true },
        { seasonTeamId: 'st-2', notifyMatchStart: true, notifyGoals: true, notifyFinal: true },
      ],
    })

    const result = await syncFavoriteTeamSubscriptions()

    expect(result).toEqual({ synced: true })
    expect(mocks.replaceSubscriptions).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      {
        teams: [
          { seasonTeamId: 'st-1', notifyMatchStart: true, notifyGoals: true, notifyFinal: true },
          { seasonTeamId: 'st-2', notifyMatchStart: true, notifyGoals: true, notifyFinal: true },
        ],
      },
    )
    expect(await isSubscriptionsSyncPending()).toBe(false)
  })

  it('marks sync pending on network failure without changing local favorites', async () => {
    const store = new Map<string, string>()
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => store.get(key) ?? null)
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      store.set(key, value)
    })

    await toggleFavoriteTeam('st-9')
    mocks.replaceSubscriptions.mockRejectedValue(new Error('network'))

    const result = await syncFavoriteTeamSubscriptions(['st-9'])

    expect(result).toEqual({ synced: false })
    expect(await isSubscriptionsSyncPending()).toBe(true)
    expect(store.get(STORAGE_KEYS.favoriteTeams)).toContain('st-9')
  })

  it('retries pending sync on foreground hook', async () => {
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) =>
      key === STORAGE_KEYS.subscriptionsSyncPending ? '1' : null,
    )
    mocks.replaceSubscriptions.mockResolvedValue({ teams: [] })

    await syncPendingSubscriptionsIfNeeded()

    expect(mocks.replaceSubscriptions).toHaveBeenCalledOnce()
  })
})

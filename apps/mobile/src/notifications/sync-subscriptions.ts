import AsyncStorage from '@react-native-async-storage/async-storage'
import type { TeamSubscriptionInput } from '@liga/mobile-contracts'
import { installationApiClient } from '../api/installation-client'
import { loadFavoriteTeams } from '../storage/favorites'
import { STORAGE_KEYS } from '../storage/keys'
import { getOrCreateInstallationId } from './installation-id'

function buildTeamSubscriptions(seasonTeamIds: string[]): TeamSubscriptionInput[] {
  return seasonTeamIds.map((seasonTeamId) => ({
    seasonTeamId,
    notifyMatchStart: true,
    notifyGoals: true,
    notifyFinal: true,
  }))
}

async function setSyncPending(pending: boolean): Promise<void> {
  if (pending) {
    await AsyncStorage.setItem(STORAGE_KEYS.subscriptionsSyncPending, '1')
    return
  }
  await AsyncStorage.removeItem(STORAGE_KEYS.subscriptionsSyncPending)
}

export async function isSubscriptionsSyncPending(): Promise<boolean> {
  return (await AsyncStorage.getItem(STORAGE_KEYS.subscriptionsSyncPending)) === '1'
}

export async function syncFavoriteTeamSubscriptions(
  seasonTeamIds?: string[],
): Promise<{ synced: boolean }> {
  const favorites = seasonTeamIds ?? (await loadFavoriteTeams()).seasonTeamIds
  const installationId = await getOrCreateInstallationId()

  try {
    await installationApiClient.replaceSubscriptions(installationId, {
      teams: buildTeamSubscriptions(favorites),
    })
    await setSyncPending(false)
    return { synced: true }
  } catch {
    await setSyncPending(true)
    return { synced: false }
  }
}

export async function syncPendingSubscriptionsIfNeeded(): Promise<void> {
  if (!(await isSubscriptionsSyncPending())) return
  await syncFavoriteTeamSubscriptions()
}

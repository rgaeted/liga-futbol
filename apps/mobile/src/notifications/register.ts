import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { MobilePlatformCode } from '@liga/mobile-contracts'
import { installationApiClient } from '../api/installation-client'
import { getOrCreateInstallationId } from './installation-id'

export type RegisterNotificationsResult =
  | { registered: true; installationId: string }
  | {
      registered: false
      reason: 'permission-denied' | 'no-project-id' | 'no-token' | 'network-error'
    }

function resolvePlatform(): MobilePlatformCode {
  return Platform.OS === 'ios' ? 'IOS' : 'ANDROID'
}

export async function registerForLeagueNotifications(): Promise<RegisterNotificationsResult> {
  let permission = await Notifications.getPermissionsAsync()
  if (permission.status !== 'granted') {
    permission = await Notifications.requestPermissionsAsync()
  }

  if (permission.status !== 'granted') {
    return { registered: false, reason: 'permission-denied' }
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  if (typeof projectId !== 'string' || projectId.length === 0) {
    return { registered: false, reason: 'no-project-id' }
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId })
  if (!tokenResult.data) {
    return { registered: false, reason: 'no-token' }
  }

  const installationId = await getOrCreateInstallationId()

  try {
    await installationApiClient.registerInstallation({
      installationId,
      expoPushToken: tokenResult.data,
      platform: resolvePlatform(),
      appVersion: Constants.expoConfig?.version,
    })
    return { registered: true, installationId }
  } catch {
    return { registered: false, reason: 'network-error' }
  }
}

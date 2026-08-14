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

const PERMISSION_TIMEOUT_MS = 15_000
const PUSH_TOKEN_TIMEOUT_MS = 10_000

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), ms)
      }),
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export async function registerForLeagueNotifications(): Promise<RegisterNotificationsResult> {
  let permission = await Notifications.getPermissionsAsync()
  if (permission.status !== 'granted') {
    const requested = await withTimeout(
      Notifications.requestPermissionsAsync(),
      PERMISSION_TIMEOUT_MS,
    )
    if (!requested) {
      return { registered: false, reason: 'permission-denied' }
    }
    permission = requested
  }

  if (permission.status !== 'granted') {
    return { registered: false, reason: 'permission-denied' }
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  if (typeof projectId !== 'string' || projectId.length === 0) {
    return { registered: false, reason: 'no-project-id' }
  }

  const tokenResult = await withTimeout(
    Notifications.getExpoPushTokenAsync({ projectId }),
    PUSH_TOKEN_TIMEOUT_MS,
  )
  if (!tokenResult?.data) {
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

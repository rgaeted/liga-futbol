import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  registerInstallation: vi.fn(),
  getOrCreateInstallationId: vi.fn(),
}))

vi.mock('../../src/api/installation-client', () => ({
  installationApiClient: {
    registerInstallation: mocks.registerInstallation,
  },
}))

vi.mock('../../src/notifications/installation-id', () => ({
  getOrCreateInstallationId: mocks.getOrCreateInstallationId,
}))

vi.mock('react-native', async () => {
  const RN = await import('react-native-web')
  return {
    ...RN,
    Platform: { OS: 'ios' },
  }
})

import { registerForLeagueNotifications } from '../../src/notifications/register'

describe('registerForLeagueNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOrCreateInstallationId.mockResolvedValue('11111111-1111-4111-8111-111111111111')
    vi.spyOn(Constants, 'expoConfig', 'get').mockReturnValue({
      version: '1.0.0',
      extra: { eas: { projectId: 'eas-project-123' } },
    } as never)
  })

  it('registers installation when permission is granted', async () => {
    vi.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({
      status: 'granted',
    } as never)
    vi.spyOn(Notifications, 'getExpoPushTokenAsync').mockResolvedValue({
      data: 'ExpoPushToken[abc123]',
    } as never)
    mocks.registerInstallation.mockResolvedValue({
      installationId: '11111111-1111-4111-8111-111111111111',
      status: 'ACTIVE',
    })

    const result = await registerForLeagueNotifications()

    expect(result).toEqual({
      registered: true,
      installationId: '11111111-1111-4111-8111-111111111111',
    })
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: 'eas-project-123',
    })
    expect(mocks.registerInstallation).toHaveBeenCalledWith({
      installationId: '11111111-1111-4111-8111-111111111111',
      expoPushToken: 'ExpoPushToken[abc123]',
      platform: 'IOS',
      appVersion: '1.0.0',
    })
  })

  it('returns permission-denied without calling the API', async () => {
    vi.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({
      status: 'denied',
    } as never)
    vi.spyOn(Notifications, 'requestPermissionsAsync').mockResolvedValue({
      status: 'denied',
    } as never)

    const result = await registerForLeagueNotifications()

    expect(result).toEqual({ registered: false, reason: 'permission-denied' })
    expect(mocks.registerInstallation).not.toHaveBeenCalled()
  })

  it('returns no-token when Expo push token fetch times out', async () => {
    vi.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({
      status: 'granted',
    } as never)
    vi.spyOn(Notifications, 'getExpoPushTokenAsync').mockImplementation(
      () => new Promise(() => undefined),
    )

    const result = await registerForLeagueNotifications()

    expect(result).toEqual({ registered: false, reason: 'no-token' })
    expect(mocks.registerInstallation).not.toHaveBeenCalled()
  }, 12_000)
})

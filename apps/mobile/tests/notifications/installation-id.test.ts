import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getOrCreateInstallationId } from '../../src/notifications/installation-id'
import { STORAGE_KEYS } from '../../src/storage/keys'

describe('installation identity on native devices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses Expo to create and persist the installation identity', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null)
    const id = await getOrCreateInstallationId()
    expect(randomUUID).toHaveBeenCalledOnce()
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.installationId, id)
  })

  it('keeps the saved identity when the app is reopened', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('saved-installation')
    expect(await getOrCreateInstallationId()).toBe('saved-installation')
    expect(randomUUID).not.toHaveBeenCalled()
  })
})

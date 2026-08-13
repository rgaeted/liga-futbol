import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '../storage/keys'

export async function getOrCreateInstallationId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_KEYS.installationId)
  if (existing) return existing

  const id = crypto.randomUUID()
  await AsyncStorage.setItem(STORAGE_KEYS.installationId, id)
  return id
}

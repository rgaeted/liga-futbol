import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from './keys'

const listeners = new Set<(completed: boolean) => void>()

export function subscribeOnboarding(listener: (completed: boolean) => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export async function isOnboardingComplete(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.onboardingComplete)
  return value === 'true'
}

export async function completeOnboarding(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.onboardingComplete, 'true')
  listeners.forEach((listener) => listener(true))
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.onboardingComplete)
  listeners.forEach((listener) => listener(false))
}

import { QueryClientProvider } from '@tanstack/react-query'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useOnboardingGate } from '@/src/hooks/useOnboardingGate'
import { createMobileQueryClient } from '@/src/lib/query-client'
import { attachNotificationResponseListener } from '@/src/notifications/listeners'
import { syncPendingSubscriptionsIfNeeded } from '@/src/notifications/sync-subscriptions'

const queryClient = createMobileQueryClient()

function NotificationBootstrap() {
  const router = useRouter()

  useEffect(() => {
    return attachNotificationResponseListener((path) => {
      router.push(path as never)
    })
  }, [router])

  useEffect(() => {
    void syncPendingSubscriptionsIfNeeded()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncPendingSubscriptionsIfNeeded()
      }
    })
    return () => subscription.remove()
  }, [])

  return null
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { ready, completed } = useOnboardingGate()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!ready || completed === null) return
    const inOnboarding = segments[0] === '(onboarding)'
    if (!completed && !inOnboarding) {
      router.replace('/(onboarding)')
    } else if (completed && inOnboarding) {
      router.replace('/(tabs)')
    }
  }, [ready, completed, segments, router])

  if (!ready) return null
  return <>{children}</>
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <OnboardingGate>
          <NotificationBootstrap />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </OnboardingGate>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { registerForLeagueNotifications } from '@/src/notifications/register'
import { syncFavoriteTeamSubscriptions } from '@/src/notifications/sync-subscriptions'
import { completeOnboarding } from '@/src/storage/onboarding'
import { theme } from '@/src/theme'

export default function NotificationOnboardingScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleContinue() {
    if (loading) return
    setLoading(true)
    try {
      const registration = await registerForLeagueNotifications()
      if (registration.registered) {
        await syncFavoriteTeamSubscriptions()
      }
    } finally {
      await completeOnboarding()
      router.replace('/(tabs)')
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notificaciones</Text>
      <Text style={styles.copy}>
        Te avisaremos cuando empiece un partido en vivo o cuando tu equipo juegue.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: loading, busy: loading }}
        disabled={loading}
        onPress={() => void handleContinue()}
        style={[styles.button, loading && styles.buttonDisabled]}>
        {loading ? (
          <ActivityIndicator color={theme.secondary} />
        ) : (
          <Text style={styles.buttonLabel}>Continuar</Text>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: theme.background,
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: theme.text },
  copy: { color: theme.textMuted, lineHeight: 22 },
  button: {
    marginTop: 16,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonLabel: { color: theme.secondary, fontWeight: '700' },
})

import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { registerForLeagueNotifications } from '@/src/notifications/register'
import { syncFavoriteTeamSubscriptions } from '@/src/notifications/sync-subscriptions'
import { completeOnboarding } from '@/src/storage/onboarding'
import { theme } from '@/src/theme'

export default function NotificationOnboardingScreen() {
  const router = useRouter()

  async function handleContinue() {
    const registration = await registerForLeagueNotifications()
    if (registration.registered) {
      await syncFavoriteTeamSubscriptions()
    }
    await completeOnboarding()
    router.replace('/(tabs)')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notificaciones</Text>
      <Text style={styles.copy}>
        Te avisaremos cuando empiece un partido en vivo o cuando tu equipo juegue.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void handleContinue()}
        style={styles.button}>
        <Text style={styles.buttonLabel}>Continuar</Text>
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
  },
  buttonLabel: { color: theme.secondary, fontWeight: '700' },
})

import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { getRuntimeEditionConfig } from '@/src/lib/runtime-config'
import { theme } from '@/src/theme'

export default function WelcomeOnboardingScreen() {
  const edition = getRuntimeEditionConfig()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido</Text>
      <Text style={styles.subtitle}>{edition.displayName}</Text>
      <Text style={styles.copy}>
        Sigue tu liga favorita, elige equipos y recibe avisos de partidos en vivo.
      </Text>
      <Link href="/(onboarding)/favorites" asChild>
        <Pressable style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonLabel}>Comenzar</Text>
        </Pressable>
      </Link>
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.text,
  },
  subtitle: {
    fontSize: 18,
    color: theme.primary,
    fontWeight: '700',
  },
  copy: {
    color: theme.textMuted,
    lineHeight: 22,
  },
  button: {
    marginTop: 16,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonLabel: {
    color: theme.secondary,
    fontWeight: '700',
    fontSize: 16,
  },
})

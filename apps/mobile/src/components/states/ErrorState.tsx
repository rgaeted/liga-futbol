import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function ErrorState({
  message = 'No pudimos cargar la información',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          onPress={onRetry}
          style={styles.button}>
          <Text style={styles.buttonLabel}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  message: {
    color: theme.error,
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonLabel: {
    color: theme.secondary,
    fontWeight: '600',
  },
})

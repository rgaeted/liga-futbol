import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <ActivityIndicator color={theme.primary} accessibilityLabel={label} />
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  label: {
    color: theme.textMuted,
    fontSize: 16,
  },
})

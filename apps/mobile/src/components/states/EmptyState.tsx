import { StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function EmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: theme.textMuted,
    textAlign: 'center',
  },
})

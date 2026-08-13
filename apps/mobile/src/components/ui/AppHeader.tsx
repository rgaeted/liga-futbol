import { StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: theme.textMuted,
  },
})

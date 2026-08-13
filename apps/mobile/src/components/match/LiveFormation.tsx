import { StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function LiveFormation() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Formaciones</Text>
      <Text style={styles.placeholder}>Las formaciones aparecerán aquí cuando estén disponibles.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: theme.surface,
    borderRadius: 12,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
    color: theme.text,
  },
  placeholder: {
    color: theme.textMuted,
  },
})

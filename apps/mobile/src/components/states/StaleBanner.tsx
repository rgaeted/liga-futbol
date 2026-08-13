import { StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function StaleBanner() {
  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel="Datos desactualizados">
      <Text style={styles.label}>Datos desactualizados — mostrando la última información disponible</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF4E5',
    borderColor: '#FFB020',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    color: theme.text,
    fontSize: 13,
  },
})

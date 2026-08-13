import { Link, Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'No encontrado' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Esta pantalla no existe.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Volver al inicio</Text>
        </Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: theme.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  link: {
    marginTop: 16,
  },
  linkText: {
    color: theme.primary,
    fontWeight: '600',
  },
})

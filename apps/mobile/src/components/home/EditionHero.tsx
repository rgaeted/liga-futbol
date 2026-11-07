import { Image, StyleSheet, Text, View } from 'react-native'
import { getRuntimeEditionConfig } from '@/src/lib/runtime-config'

export function EditionHero() {
  const edition = getRuntimeEditionConfig()
  if (edition.key !== 'kelme-cup-los-lagos-2026') return null

  return (
    <View style={styles.card}>
      <Image
        source={require('../../../editions/kelme-cup-los-lagos-2026/assets/splash.png')}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel="Kelme Cup Los Lagos 2026"
      />
      <View style={styles.caption}>
        <Text style={styles.eyebrow}>FÚTBOL · LOS LAGOS</Text>
        <Text style={styles.title}>Tu copa, en un solo lugar.</Text>
        <Text style={styles.copy}>Partidos, resultados y toda la pasión de tu equipo.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#071E38', borderRadius: 24, overflow: 'hidden' },
  image: { width: '100%', height: 300, backgroundColor: '#EAF5FF' },
  caption: { padding: 22, gap: 8 },
  eyebrow: { color: '#78C8FF', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 24, lineHeight: 30, fontWeight: '800' },
  copy: { color: '#CEDDEC', fontSize: 14, lineHeight: 21 },
})

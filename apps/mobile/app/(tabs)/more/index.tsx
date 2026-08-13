import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { theme } from '@/src/theme'

const LINKS = [
  { href: '/more/teams', label: 'Equipos' },
  { href: '/more/news', label: 'Noticias' },
  { href: '/more/galleries', label: 'Galerías' },
  { href: '/more/sponsors', label: 'Patrocinadores' },
  { href: '/more/league-info', label: 'Información de la liga' },
  { href: '/more/privacy', label: 'Privacidad' },
] as const

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <AppHeader title="Más" />
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} asChild>
          <Pressable style={styles.row} accessibilityRole="button">
            <Text style={styles.label}>{link.label}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  label: { fontSize: 16, color: theme.text, fontWeight: '600' },
})

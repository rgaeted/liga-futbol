import { Link } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { MOBILE_APP_PRIVACY_SECTIONS, MOBILE_APP_PRIVACY_URL } from '@/src/lib/privacy-content'
import { theme } from '@/src/theme'

export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <AppHeader title="Privacidad" />
      <ScrollView contentContainerStyle={styles.content}>
        {MOBILE_APP_PRIVACY_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir política de privacidad completa en el navegador"
          onPress={() => void WebBrowser.openBrowserAsync(MOBILE_APP_PRIVACY_URL)}
          style={styles.linkButton}>
          <Text style={styles.linkLabel}>Ver política completa en la web</Text>
        </Pressable>
        <Link href="/more" asChild>
          <Pressable accessibilityRole="button" style={styles.backButton}>
            <Text style={styles.backLabel}>Volver a Más</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  section: { gap: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  sectionBody: { color: theme.textMuted, lineHeight: 22 },
  linkButton: {
    marginTop: 8,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  linkLabel: { color: theme.secondary, fontWeight: '700' },
  backButton: { alignItems: 'center', paddingVertical: 8 },
  backLabel: { color: theme.textMuted, fontWeight: '600' },
})

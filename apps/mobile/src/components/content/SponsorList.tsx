import type { MobileSponsor } from '@liga/mobile-contracts'
import * as WebBrowser from 'expo-web-browser'
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function SponsorList({ sponsors }: { sponsors: MobileSponsor[] }) {
  return (
    <FlatList
      data={sponsors}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          {item.logoUrl ? (
            <Image source={{ uri: item.logoUrl }} style={styles.logo} accessibilityIgnoresInvertColors />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoFallbackText}>{item.name.slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name}>{item.name}</Text>
          {item.websiteUrl ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Visitar sitio de ${item.name}`}
              onPress={() => void WebBrowser.openBrowserAsync(item.websiteUrl!)}>
              <Text style={styles.link}>Visitar sitio</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: theme.surface,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  logoFallback: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    fontWeight: '700',
    color: theme.textMuted,
  },
  name: {
    fontWeight: '600',
    color: theme.text,
  },
  link: {
    color: theme.primary,
    fontWeight: '600',
  },
})

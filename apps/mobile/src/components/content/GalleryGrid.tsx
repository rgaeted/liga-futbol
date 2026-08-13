import type { MobileGallerySummary } from '@liga/mobile-contracts'
import { Link } from 'expo-router'
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function GalleryGrid({ galleries }: { galleries: MobileGallerySummary[] }) {
  return (
    <FlatList
      data={galleries}
      numColumns={2}
      keyExtractor={(item) => item.id}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => (
        <Link href={`/more/galleries/${item.id}`} asChild>
          <Pressable style={styles.card} accessibilityRole="button">
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.cover} accessibilityIgnoresInvertColors />
            ) : (
              <View style={styles.coverFallback}>
                <Text style={styles.coverFallbackText}>Sin portada</Text>
              </View>
            )}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.photoCount} fotos</Text>
          </Pressable>
        </Link>
      )}
    />
  )
}

const styles = StyleSheet.create({
  row: {
    gap: 12,
    paddingHorizontal: 12,
  },
  card: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cover: {
    width: '100%',
    height: 120,
  },
  coverFallback: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.border,
  },
  coverFallbackText: {
    color: theme.textMuted,
  },
  title: {
    padding: 8,
    fontWeight: '600',
    color: theme.text,
  },
  meta: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    color: theme.textMuted,
    fontSize: 12,
  },
})

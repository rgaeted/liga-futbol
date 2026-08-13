import { useLocalSearchParams } from 'expo-router'
import { FlatList, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useGalleryQuery } from '@/src/api/queries'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { theme } from '@/src/theme'

export default function GalleryDetailScreen() {
  const { galleryId } = useLocalSearchParams<{ galleryId: string }>()
  const { data, isLoading, error, refetch } = useGalleryQuery(galleryId)

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState onRetry={() => void refetch()} />

  return (
    <ScrollView style={styles.container}>
      <AppHeader title={data.title} subtitle={data.description ?? undefined} />
      <FlatList
        data={data.photos}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.photo}>
            <Image
              source={{ uri: item.url }}
              style={styles.image}
              accessibilityLabel={item.altText ?? item.caption ?? 'Foto de galería'}
              accessibilityIgnoresInvertColors
            />
            {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
          </View>
        )}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  photo: { padding: 16 },
  image: { width: '100%', height: 220, borderRadius: 12 },
  caption: { marginTop: 8, color: theme.textMuted },
})

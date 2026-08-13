import { ScrollView, StyleSheet } from 'react-native'
import { useGalleriesQuery } from '@/src/api/queries'
import { GalleryGrid } from '@/src/components/content/GalleryGrid'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { EmptyState } from '@/src/components/states/EmptyState'
import { theme } from '@/src/theme'

export default function GalleriesScreen() {
  const { data, isLoading, error, refetch } = useGalleriesQuery()

  return (
    <ScrollView style={styles.container}>
      <AppHeader title="Galerías" />
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.items.length ? (
        <EmptyState title="Aún no hay galerías publicadas" />
      ) : (
        <GalleryGrid galleries={data.items} />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
})

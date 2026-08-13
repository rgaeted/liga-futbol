import { ScrollView, StyleSheet } from 'react-native'
import { useSponsorsQuery } from '@/src/api/queries'
import { SponsorList } from '@/src/components/content/SponsorList'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { EmptyState } from '@/src/components/states/EmptyState'
import { theme } from '@/src/theme'

export default function SponsorsScreen() {
  const { data, isLoading, error, refetch } = useSponsorsQuery()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppHeader title="Patrocinadores" />
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.length ? (
        <EmptyState title="Aún no hay patrocinadores activos" />
      ) : (
        <SponsorList sponsors={data} />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16 },
})

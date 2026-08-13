import { ScrollView, StyleSheet } from 'react-native'
import { useStatsQuery } from '@/src/api/queries'
import { StatsTabs } from '@/src/components/stats/StatsTabs'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { theme } from '@/src/theme'

export default function StatsScreen() {
  const { data, isLoading, error, refetch } = useStatsQuery()

  return (
    <ScrollView style={styles.container}>
      <AppHeader title="Estadísticas" />
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data ? (
        <StatsTabs stats={data} />
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
})

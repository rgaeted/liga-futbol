import { ScrollView, StyleSheet } from 'react-native'
import { useStandingsQuery } from '@/src/api/queries'
import { StandingsTable } from '@/src/components/standings/StandingsTable'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { useFavoriteTeams } from '@/src/hooks/useFavoriteTeams'
import { theme } from '@/src/theme'

export default function StandingsScreen() {
  const { data, isLoading, error, refetch } = useStandingsQuery()
  const { state } = useFavoriteTeams()

  return (
    <ScrollView style={styles.container}>
      <AppHeader title="Tabla de posiciones" />
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <StandingsTable rows={data ?? []} favoriteTeamIds={state?.seasonTeamIds ?? []} />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
})

import { ScrollView, StyleSheet } from 'react-native'
import { useTeamsQuery } from '@/src/api/queries'
import { TeamCard } from '@/src/components/teams/TeamCard'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { theme } from '@/src/theme'

export default function TeamsScreen() {
  const { data, isLoading, error, refetch } = useTeamsQuery()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppHeader title="Equipos" />
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        data?.map((team) => <TeamCard key={team.seasonTeamId} team={team} />)
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16 },
})

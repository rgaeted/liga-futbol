import { useLocalSearchParams } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTeamQuery } from '@/src/api/queries'
import { MatchList } from '@/src/components/match/MatchList'
import { RosterList } from '@/src/components/teams/RosterList'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { useFavoriteTeams } from '@/src/hooks/useFavoriteTeams'
import { theme } from '@/src/theme'

export default function TeamDetailScreen() {
  const { seasonTeamId } = useLocalSearchParams<{ seasonTeamId: string }>()
  const { data, isLoading, error, refetch } = useTeamQuery(seasonTeamId)
  const { isFavorite, toggle } = useFavoriteTeams()

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState onRetry={() => void refetch()} />

  const following = isFavorite(data.seasonTeamId)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppHeader title={data.name} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={following ? 'Dejar de seguir equipo' : 'Seguir equipo'}
        onPress={() => void toggle(data.seasonTeamId)}
        style={[styles.follow, following && styles.followActive]}>
        <Text style={styles.followLabel}>{following ? 'Siguiendo equipo' : 'Seguir equipo'}</Text>
      </Pressable>
      <Text style={styles.sectionTitle}>Plantel</Text>
      <RosterList roster={data.roster} />
      {data.upcomingMatches.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximos partidos</Text>
          <MatchList matches={data.upcomingMatches} />
        </View>
      ) : null}
      {data.recentResults.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resultados recientes</Text>
          <MatchList matches={data.recentResults} />
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16 },
  follow: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.surface,
    marginBottom: 16,
  },
  followActive: { backgroundColor: theme.primary },
  followLabel: { fontWeight: '600', color: theme.text },
  section: { marginTop: 16 },
  sectionTitle: { fontWeight: '700', marginBottom: 8, color: theme.text },
})

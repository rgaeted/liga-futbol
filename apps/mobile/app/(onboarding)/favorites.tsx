import { Link } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTeamsQuery } from '@/src/api/queries'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { TeamCard } from '@/src/components/teams/TeamCard'
import { useFavoriteTeams } from '@/src/hooks/useFavoriteTeams'
import { theme } from '@/src/theme'

export default function FavoritesOnboardingScreen() {
  const { data, isLoading, error, refetch } = useTeamsQuery()
  const { isFavorite, toggle } = useFavoriteTeams()

  if (isLoading) return <LoadingState label="Cargando equipos…" />
  if (error) return <ErrorState onRetry={() => void refetch()} />

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Elige tus equipos</Text>
      <Text style={styles.subtitle}>Puedes cambiarlos después desde la ficha de cada equipo.</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {data?.map((team) => (
          <View key={team.seasonTeamId} style={styles.row}>
            <View style={styles.flex}>
              <TeamCard team={team} />
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isFavorite(team.seasonTeamId) }}
              accessibilityLabel={`Seguir a ${team.name}`}
              onPress={() => void toggle(team.seasonTeamId)}
              style={[styles.chip, isFavorite(team.seasonTeamId) && styles.chipActive]}>
              <Text style={styles.chipLabel}>
                {isFavorite(team.seasonTeamId) ? 'Siguiendo' : 'Seguir'}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <Link href="/(onboarding)/notifications" asChild>
        <Pressable style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonLabel}>Continuar</Text>
        </Pressable>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: theme.background },
  title: { fontSize: 24, fontWeight: '800', color: theme.text },
  subtitle: { color: theme.textMuted, marginBottom: 12 },
  list: { paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.surface,
  },
  chipActive: { backgroundColor: theme.primary },
  chipLabel: { color: theme.text, fontWeight: '600' },
  button: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonLabel: { color: theme.secondary, fontWeight: '700' },
})

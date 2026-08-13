import { useLocalSearchParams } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { usePlayerQuery } from '@/src/api/queries'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { theme } from '@/src/theme'

export default function PlayerDetailScreen() {
  const { rosterEntryId } = useLocalSearchParams<{ rosterEntryId: string }>()
  const { data, isLoading, error, refetch } = usePlayerQuery(rosterEntryId)

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState onRetry={() => void refetch()} />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppHeader title={data.name} subtitle={data.teamName} />
      <View style={styles.card}>
        <Text style={styles.label}>Dorsal</Text>
        <Text style={styles.value}>{data.jerseyNumber ?? 'Sin dorsal'}</Text>
        <Text style={styles.label}>Posición</Text>
        <Text style={styles.value}>{data.position ?? 'Sin posición'}</Text>
        <Text style={styles.label}>Goles</Text>
        <Text style={styles.value}>{data.stats.goals}</Text>
        <Text style={styles.label}>Asistencias</Text>
        <Text style={styles.value}>{data.stats.assists}</Text>
        <Text style={styles.label}>MVPs</Text>
        <Text style={styles.value}>{data.stats.mvpCount}</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  label: { color: theme.textMuted, fontSize: 13 },
  value: { color: theme.text, fontWeight: '600', marginBottom: 8 },
})

import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLeagueQuery } from '@/src/api/queries'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { formatPublishedDateLabel } from '@/src/lib/format'
import { theme } from '@/src/theme'

export default function LeagueInfoScreen() {
  const { data, isLoading, error, refetch } = useLeagueQuery()

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState onRetry={() => void refetch()} />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppHeader title="Información de la liga" subtitle={data.displayName} />
      {data.description ? <Text style={styles.body}>{data.description}</Text> : null}
      <View style={styles.card}>
        <Text style={styles.label}>Formato</Text>
        <Text style={styles.value}>{data.footballFormat}</Text>
        <Text style={styles.label}>Inicio de temporada</Text>
        <Text style={styles.value}>{formatPublishedDateLabel(data.season.startDate)}</Text>
        <Text style={styles.label}>Fin de temporada</Text>
        <Text style={styles.value}>{formatPublishedDateLabel(data.season.endDate)}</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, gap: 12 },
  body: { color: theme.text, lineHeight: 22 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  label: { color: theme.textMuted, fontSize: 13 },
  value: { color: theme.text, fontWeight: '600', marginBottom: 8 },
})

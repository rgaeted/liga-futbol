import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMatchQuery } from '@/src/api/queries'
import { LiveFormation } from '@/src/components/match/LiveFormation'
import { LiveScoreboard } from '@/src/components/match/LiveScoreboard'
import { LiveTimeline } from '@/src/components/match/LiveTimeline'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { ErrorState } from '@/src/components/states/ErrorState'
import { LoadingState } from '@/src/components/states/LoadingState'
import { StaleBanner } from '@/src/components/states/StaleBanner'
import { useMobileLiveSnapshot } from '@/src/hooks/useMobileLiveSnapshot'
import { theme } from '@/src/theme'

export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>()
  const { data, isLoading, error, refetch } = useMatchQuery(matchId)

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState onRetry={() => void refetch()} />

  return <MatchDetailContent matchId={matchId} initialMatch={data} />
}

function MatchDetailContent({
  matchId,
  initialMatch,
}: {
  matchId: string
  initialMatch: NonNullable<ReturnType<typeof useMatchQuery>['data']>
}) {
  const router = useRouter()
  const initialSnapshot = {
    id: initialMatch.id,
    status: initialMatch.status,
    home: initialMatch.home,
    away: initialMatch.away,
    homeScore: initialMatch.homeScore,
    awayScore: initialMatch.awayScore,
    clock: {
      status: initialMatch.status,
      clockStartedAt: null,
      secondHalfStartedAt: null,
      halftimeAt: null,
    },
    events: [],
    venue: initialMatch.venue,
    locationLabel: initialMatch.locationLabel,
    weather: initialMatch.weather,
  }

  const { snapshot, realtimeStatus } = useMobileLiveSnapshot({ initialSnapshot })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/(tabs)/matches')}
        style={styles.backButton}>
        <Text style={styles.backLabel}>← Volver a partidos</Text>
      </Pressable>
      <AppHeader title={`${initialMatch.home.name} vs ${initialMatch.away.name}`} />
      {realtimeStatus === 'degraded' ? <StaleBanner /> : null}
      <LiveScoreboard snapshot={snapshot} />
      {initialMatch.locationLabel ? (
        <Text style={styles.location}>{initialMatch.locationLabel}</Text>
      ) : null}
      {initialMatch.weather ? (
        <Text style={styles.weather}>
          {initialMatch.weather.label} · {initialMatch.weather.tempC}°C
        </Text>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cronología</Text>
        <LiveTimeline events={snapshot.events} />
      </View>
      <LiveFormation />
    </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, gap: 16 },
  backButton: { minHeight: 48, justifyContent: 'center' },
  backLabel: { color: theme.primary, fontWeight: '700' },
  location: { color: theme.textMuted },
  weather: { color: theme.textMuted },
  section: { marginTop: 8 },
  sectionTitle: { fontWeight: '700', marginBottom: 8, color: theme.text },
})

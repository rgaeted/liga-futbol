import type { MobileMatchSummary } from '@liga/mobile-contracts'
import { formatMatchStatus } from '@liga/mobile-core'
import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatScheduleTimeLabel } from '@/src/lib/format'
import { theme } from '@/src/theme'

export function MatchCard({ match }: { match: MobileMatchSummary }) {
  return (
    <Link href={`/matches/${match.id}`} asChild>
      <Pressable style={styles.card} accessibilityRole="button">
        <Text style={styles.time}>{formatScheduleTimeLabel(match.scheduledAt)}</Text>
        <View style={styles.row}>
          <Text style={styles.team}>{match.home.name}</Text>
          <Text style={styles.score}>
            {match.homeScore} - {match.awayScore}
          </Text>
          <Text style={styles.team}>{match.away.name}</Text>
        </View>
        <Text style={styles.status}>{formatMatchStatus(match.status)}</Text>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  time: {
    color: theme.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  team: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.primary,
  },
  status: {
    marginTop: 6,
    fontSize: 13,
    color: theme.textMuted,
  },
})

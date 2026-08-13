import type { MobileLiveSnapshot } from '@liga/mobile-contracts'
import { formatMatchMinute, getMatchClock } from '@liga/mobile-core'
import { StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function LiveScoreboard({ snapshot }: { snapshot: MobileLiveSnapshot }) {
  const clock = getMatchClock({
    status: snapshot.status,
    clockStartedAt: snapshot.clock.clockStartedAt
      ? new Date(snapshot.clock.clockStartedAt)
      : null,
    secondHalfStartedAt: snapshot.clock.secondHalfStartedAt
      ? new Date(snapshot.clock.secondHalfStartedAt)
      : null,
    halftimeAt: snapshot.clock.halftimeAt ? new Date(snapshot.clock.halftimeAt) : null,
  })

  return (
    <View style={styles.container}>
      <Text style={styles.minute}>{formatMatchMinute(clock.minute)}</Text>
      <View style={styles.row}>
        <Text style={styles.team}>{snapshot.home.name}</Text>
        <Text style={styles.score}>
          {snapshot.homeScore} - {snapshot.awayScore}
        </Text>
        <Text style={styles.team}>{snapshot.away.name}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 12,
  },
  minute: {
    color: theme.secondary,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  team: {
    flex: 1,
    color: theme.secondary,
    fontWeight: '700',
  },
  score: {
    color: theme.secondary,
    fontSize: 28,
    fontWeight: '800',
  },
})

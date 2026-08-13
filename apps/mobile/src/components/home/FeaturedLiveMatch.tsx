import type { MobileMatchSummary } from '@liga/mobile-contracts'
import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function FeaturedLiveMatch({ match }: { match: MobileMatchSummary }) {
  return (
    <Link href={`/matches/${match.id}`} asChild>
      <Pressable style={styles.card} accessibilityRole="button" accessibilityLabel="Partido en vivo">
        <Text style={styles.badge}>EN VIVO</Text>
        <View style={styles.row}>
          <Text style={styles.team}>{match.home.name}</Text>
          <Text style={styles.score}>
            {match.homeScore} - {match.awayScore}
          </Text>
          <Text style={styles.team}>{match.away.name}</Text>
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  badge: {
    color: theme.secondary,
    fontWeight: '800',
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
    fontSize: 24,
    fontWeight: '800',
    marginHorizontal: 8,
  },
})

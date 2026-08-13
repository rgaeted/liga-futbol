import type { MobileMatchSummary } from '@liga/mobile-contracts'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { groupMatchesByDate } from '@/src/lib/format'
import { MatchCard } from './MatchCard'
import { theme } from '@/src/theme'

export function MatchList({ matches }: { matches: MobileMatchSummary[] }) {
  const groups = groupMatchesByDate(matches)

  return (
    <View>
      {groups.map((group) => (
        <View key={group.dateKey} style={styles.group}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          {group.items.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </View>
      ))}
    </View>
  )
}

export function MatchListFlat({ matches }: { matches: MobileMatchSummary[] }) {
  return (
    <FlatList
      data={matches}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MatchCard match={item} />}
      contentContainerStyle={styles.list}
    />
  )
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  list: {
    padding: 16,
  },
})

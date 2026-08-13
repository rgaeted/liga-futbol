import type { MobileRosterPlayer } from '@liga/mobile-contracts'
import { teamInitials } from '@liga/mobile-core'
import { Link } from 'expo-router'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function RosterList({ roster }: { roster: MobileRosterPlayer[] }) {
  return (
    <FlatList
      data={roster}
      keyExtractor={(item) => item.rosterEntryId}
      renderItem={({ item }) => (
        <Link href={`/more/players/${item.rosterEntryId}`} asChild>
          <Pressable style={styles.row} accessibilityRole="button">
            <View style={styles.avatar}>
              <Text style={styles.initials}>{teamInitials(item.name)}</Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.detail}>
                {item.jerseyNumber != null ? `#${item.jerseyNumber}` : 'Sin dorsal'}
                {item.position ? ` · ${item.position}` : ''}
              </Text>
            </View>
            <Text style={styles.stats}>{item.stats.goals}G · {item.stats.assists}A</Text>
          </Pressable>
        </Link>
      )}
    />
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    color: theme.primary,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    color: theme.text,
  },
  detail: {
    color: theme.textMuted,
    fontSize: 13,
  },
  stats: {
    color: theme.textMuted,
    fontSize: 13,
  },
})

import type { MobileTeamListItem } from '@liga/mobile-contracts'
import { teamInitials } from '@liga/mobile-core'
import { Link } from 'expo-router'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function TeamCard({ team }: { team: MobileTeamListItem }) {
  const initials = team.initials || teamInitials(team.name)

  return (
    <Link href={`/more/teams/${team.seasonTeamId}`} asChild>
      <Pressable style={styles.card} accessibilityRole="button">
        {team.crestUrl ? (
          <Image source={{ uri: team.crestUrl }} style={styles.crest} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.crestFallback, { backgroundColor: team.color }]}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}
        <Text style={styles.name}>{team.name}</Text>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: theme.surface,
    borderRadius: 12,
    marginBottom: 8,
  },
  crest: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  crestFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: theme.secondary,
    fontWeight: '700',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
})

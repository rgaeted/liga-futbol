import type { MobileStandingRow } from '@liga/mobile-contracts'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function StandingsTable({
  rows,
  favoriteTeamIds = [],
}: {
  rows: MobileStandingRow[]
  favoriteTeamIds?: string[]
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View style={[styles.row, styles.header]}>
          <Text style={[styles.cell, styles.pos]}>#</Text>
          <Text style={[styles.cell, styles.team]}>Equipo</Text>
          <Text style={styles.cell}>PJ</Text>
          <Text style={styles.cell}>PG</Text>
          <Text style={styles.cell}>PE</Text>
          <Text style={styles.cell}>PP</Text>
          <Text style={styles.cell}>GF</Text>
          <Text style={styles.cell}>GC</Text>
          <Text style={styles.cell}>DG</Text>
          <Text style={styles.cell}>Pts</Text>
        </View>
        {rows.map((row) => {
          const favorite = favoriteTeamIds.includes(row.seasonTeamId)
          return (
            <View
              key={row.seasonTeamId}
              style={[styles.row, favorite && styles.favoriteRow]}
              accessibilityLabel={favorite ? `${row.name}, equipo favorito` : row.name}>
              <Text style={[styles.cell, styles.pos]}>{row.rank}</Text>
              <Text style={[styles.cell, styles.team]} numberOfLines={1}>
                {row.name}
              </Text>
              <Text style={styles.cell}>{row.pj}</Text>
              <Text style={styles.cell}>{row.pg}</Text>
              <Text style={styles.cell}>{row.pe}</Text>
              <Text style={styles.cell}>{row.pp}</Text>
              <Text style={styles.cell}>{row.gf}</Text>
              <Text style={styles.cell}>{row.gc}</Text>
              <Text style={styles.cell}>{row.dg}</Text>
              <Text style={[styles.cell, styles.points]}>{row.pts}</Text>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  header: {
    backgroundColor: theme.surface,
  },
  favoriteRow: {
    backgroundColor: '#FFF5F5',
  },
  cell: {
    width: 36,
    textAlign: 'center',
    color: theme.text,
  },
  pos: {
    width: 28,
  },
  team: {
    width: 140,
    textAlign: 'left',
    fontWeight: '600',
  },
  points: {
    fontWeight: '700',
    color: theme.primary,
  },
})

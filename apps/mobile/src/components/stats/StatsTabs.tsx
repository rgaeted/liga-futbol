import type { MobileStatsResponse } from '@liga/mobile-contracts'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

const TABS = [
  { key: 'scorers', label: 'Goles' },
  { key: 'assists', label: 'Asistencias' },
  { key: 'yellowCards', label: 'Amarillas' },
  { key: 'redCards', label: 'Rojas' },
  { key: 'mvps', label: 'MVPs' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function StatsTabs({ stats }: { stats: MobileStatsResponse }) {
  const [active, setActive] = useState<TabKey>('scorers')
  const rows = stats[active]

  return (
    <View>
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActive(tab.key)}
            style={[styles.tab, active === tab.key && styles.activeTab]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active === tab.key }}>
            <Text style={[styles.tabLabel, active === tab.key && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.rosterEntryId}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>{index + 1}</Text>
            <View style={styles.meta}>
              <Text style={styles.name}>{item.playerName}</Text>
              <Text style={styles.team}>{item.teamName}</Text>
            </View>
            <Text style={styles.value}>{item.value}</Text>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.surface,
  },
  activeTab: {
    backgroundColor: theme.primary,
  },
  tabLabel: {
    color: theme.text,
  },
  activeTabLabel: {
    color: theme.secondary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  rank: {
    width: 24,
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
  team: {
    color: theme.textMuted,
    fontSize: 13,
  },
  value: {
    fontWeight: '700',
    color: theme.text,
  },
})

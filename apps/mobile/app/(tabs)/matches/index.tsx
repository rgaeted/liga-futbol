import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMatchesQuery } from '@/src/api/queries'
import { MatchList } from '@/src/components/match/MatchList'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { EmptyState } from '@/src/components/states/EmptyState'
import { theme } from '@/src/theme'

export default function MatchesScreen() {
  const [filter, setFilter] = useState<'upcoming' | 'results'>('upcoming')
  const { data, isLoading, error, refetch } = useMatchesQuery(filter)

  return (
    <View style={styles.container}>
      <AppHeader title="Partidos" />
      <View style={styles.filters}>
        {(['upcoming', 'results'] as const).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === key }}
            onPress={() => setFilter(key)}
            style={[styles.filter, filter === key && styles.filterActive]}>
            <Text style={[styles.filterLabel, filter === key && styles.filterLabelActive]}>
              {key === 'upcoming' ? 'Próximos' : 'Resultados'}
            </Text>
          </Pressable>
        ))}
      </View>
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.items.length ? (
        <EmptyState title="Aún no hay partidos para mostrar" />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <MatchList matches={data.items} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  filters: { flexDirection: 'row', gap: 8, padding: 16 },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.surface,
  },
  filterActive: { backgroundColor: theme.primary },
  filterLabel: { color: theme.text },
  filterLabelActive: { color: theme.secondary, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
})

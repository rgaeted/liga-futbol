import type { MobileLiveEvent } from '@liga/mobile-contracts'
import { StyleSheet, Text, View } from 'react-native'
import { theme } from '@/src/theme'

export function LiveTimeline({ events }: { events: MobileLiveEvent[] }) {
  return (
    <View>
      {events.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.minute}>{item.minute}{'\u2032'}</Text>
          <View style={styles.content}>
            <Text style={styles.title}>{item.type}</Text>
            {item.playerName ? <Text style={styles.meta}>{item.playerName}</Text> : null}
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          </View>
        </View>
      ))}
      {!events.length ? <Text style={styles.empty}>Aún no hay eventos registrados</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  minute: {
    width: 36,
    fontWeight: '700',
    color: theme.primary,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    color: theme.text,
  },
  meta: {
    color: theme.textMuted,
  },
  description: {
    marginTop: 2,
    color: theme.text,
  },
  empty: {
    color: theme.textMuted,
    paddingVertical: 12,
  },
})

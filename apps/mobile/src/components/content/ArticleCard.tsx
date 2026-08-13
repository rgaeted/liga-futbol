import type { MobileArticleSummary } from '@liga/mobile-contracts'
import { Link } from 'expo-router'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { formatPublishedDateLabel } from '@/src/lib/format'
import { theme } from '@/src/theme'

export function ArticleCard({ article }: { article: MobileArticleSummary }) {
  return (
    <Link href={`/more/news/${article.id}`} asChild>
      <Pressable style={styles.card} accessibilityRole="button">
        {article.coverUrl ? (
          <Image source={{ uri: article.coverUrl }} style={styles.cover} accessibilityIgnoresInvertColors />
        ) : (
          <View style={styles.coverFallback} accessibilityLabel="Sin imagen de portada">
            <Text style={styles.coverFallbackText}>Sin imagen</Text>
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.title}>{article.title}</Text>
          {article.summary ? <Text style={styles.summary}>{article.summary}</Text> : null}
          <Text style={styles.date}>{formatPublishedDateLabel(article.publishedAt)}</Text>
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cover: {
    width: '100%',
    height: 160,
  },
  coverFallback: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.border,
  },
  coverFallbackText: {
    color: theme.textMuted,
  },
  content: {
    padding: 12,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  summary: {
    color: theme.textMuted,
  },
  date: {
    marginTop: 4,
    fontSize: 12,
    color: theme.textMuted,
  },
})

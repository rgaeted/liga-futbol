import { useLocalSearchParams } from 'expo-router'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useArticleQuery } from '@/src/api/queries'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { formatPublishedDateLabel } from '@/src/lib/format'
import { theme } from '@/src/theme'

export default function ArticleDetailScreen() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>()
  const { data, isLoading, error, refetch } = useArticleQuery(articleId)

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState onRetry={() => void refetch()} />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppHeader title={data.title} subtitle={formatPublishedDateLabel(data.publishedAt)} />
      {data.summary ? <Text style={styles.summary}>{data.summary}</Text> : null}
      <Text style={styles.body}>{data.body}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, gap: 12 },
  summary: { color: theme.textMuted, fontSize: 16 },
  body: { color: theme.text, fontSize: 16, lineHeight: 24 },
})

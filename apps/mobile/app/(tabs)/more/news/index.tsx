import { ScrollView, StyleSheet } from 'react-native'
import { useArticlesQuery } from '@/src/api/queries'
import { ArticleCard } from '@/src/components/content/ArticleCard'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { EmptyState } from '@/src/components/states/EmptyState'
import { theme } from '@/src/theme'

export default function NewsScreen() {
  const { data, isLoading, error, refetch } = useArticlesQuery()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppHeader title="Noticias" />
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.items.length ? (
        <EmptyState title="Aún no hay noticias publicadas" />
      ) : (
        data.items.map((article) => <ArticleCard key={article.id} article={article} />)
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16 },
})

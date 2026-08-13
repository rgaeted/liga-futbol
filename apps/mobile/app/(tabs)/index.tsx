import { ScrollView, StyleSheet } from 'react-native'
import { useHomeQuery } from '@/src/api/queries'
import { FeaturedLiveMatch } from '@/src/components/home/FeaturedLiveMatch'
import { HomeSection } from '@/src/components/home/HomeSection'
import { MatchList } from '@/src/components/match/MatchList'
import { ArticleCard } from '@/src/components/content/ArticleCard'
import { SponsorList } from '@/src/components/content/SponsorList'
import { AppHeader } from '@/src/components/ui/AppHeader'
import { LoadingState } from '@/src/components/states/LoadingState'
import { ErrorState } from '@/src/components/states/ErrorState'
import { StaleBanner } from '@/src/components/states/StaleBanner'
import { getRuntimeEditionConfig } from '@/src/lib/runtime-config'
import { theme } from '@/src/theme'

export default function HomeScreen() {
  const edition = getRuntimeEditionConfig()
  const { data, isLoading, error, isError, refetch, isFetching } = useHomeQuery()

  if (isLoading) return <LoadingState />
  if (error && !data) return <ErrorState onRetry={() => void refetch()} />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppHeader title="Inicio" subtitle={edition.shortName} />
      {isError && data ? <StaleBanner /> : null}
      {data?.featuredLiveMatch ? (
        <HomeSection title="En vivo">
          <FeaturedLiveMatch match={data.featuredLiveMatch} />
        </HomeSection>
      ) : null}
      {data?.upcomingMatches?.length ? (
        <HomeSection title="Próximos partidos">
          <MatchList matches={data.upcomingMatches} />
        </HomeSection>
      ) : null}
      {data?.recentResults?.length ? (
        <HomeSection title="Resultados recientes">
          <MatchList matches={data.recentResults} />
        </HomeSection>
      ) : null}
      {data?.recentArticles?.length ? (
        <HomeSection title="Noticias">
          {data.recentArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </HomeSection>
      ) : null}
      {data?.sponsors?.length ? (
        <HomeSection title="Patrocinadores">
          <SponsorList sponsors={data.sponsors} />
        </HomeSection>
      ) : null}
      {isFetching ? <LoadingState label="Actualizando…" /> : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, paddingBottom: 32 },
})

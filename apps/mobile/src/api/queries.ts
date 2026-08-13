import { useQuery } from '@tanstack/react-query'
import {
  mobileArticleDetailSchema,
  mobileGalleryDetailSchema,
  mobileLeagueConfigSchema,
  mobileLiveSnapshotSchema,
  mobileMatchDetailSchema,
  mobilePaginatedSchema,
  mobileArticleSummarySchema,
  mobileGallerySummarySchema,
  mobileSponsorSchema,
  mobileStandingRowSchema,
  mobileStatsResponseSchema,
  mobileTeamDetailSchema,
  mobileTeamListItemSchema,
  mobilePlayerDetailSchema,
} from '@liga/mobile-contracts/schemas'
import { mobileApiClient } from './client'
import { mobileApiPaths } from './paths'
import { mobileQueryKeys } from './query-keys'
import { z } from 'zod'

const mobileHomeSchema = z.object({
  league: mobileLeagueConfigSchema,
  featuredLiveMatch: z.any().nullable(),
  upcomingMatches: z.array(z.any()),
  recentResults: z.array(z.any()),
  recentArticles: z.array(mobileArticleSummarySchema),
  sponsors: z.array(mobileSponsorSchema),
})

export function useLeagueQuery() {
  return useQuery({
    queryKey: mobileQueryKeys().league,
    queryFn: () => mobileApiClient.get(mobileApiPaths().league, mobileLeagueConfigSchema),
  })
}

export function useHomeQuery() {
  return useQuery({
    queryKey: mobileQueryKeys().home,
    queryFn: () => mobileApiClient.get(mobileApiPaths().home, mobileHomeSchema),
  })
}

export function useMatchesQuery(filter: 'upcoming' | 'results') {
  const path = `${mobileApiPaths().matches}?filter=${filter}`
  return useQuery({
    queryKey: mobileQueryKeys().matches(filter),
    queryFn: () =>
      mobileApiClient.get(path, mobilePaginatedSchema(mobileMatchDetailSchema)),
  })
}

export function useMatchQuery(matchId: string) {
  return useQuery({
    queryKey: mobileQueryKeys().match(matchId),
    queryFn: () => mobileApiClient.get(mobileApiPaths().match(matchId), mobileMatchDetailSchema),
    enabled: Boolean(matchId),
  })
}

export function useLiveSnapshotQuery(matchId: string, enabled = true) {
  return useQuery({
    queryKey: mobileQueryKeys().live(matchId),
    queryFn: () => mobileApiClient.get(mobileApiPaths().live(matchId), mobileLiveSnapshotSchema),
    enabled: Boolean(matchId) && enabled,
    refetchInterval: false,
  })
}

export function useStandingsQuery() {
  return useQuery({
    queryKey: mobileQueryKeys().standings,
    queryFn: () =>
      mobileApiClient.get(mobileApiPaths().standings, z.array(mobileStandingRowSchema)),
  })
}

export function useStatsQuery() {
  return useQuery({
    queryKey: mobileQueryKeys().stats,
    queryFn: () => mobileApiClient.get(mobileApiPaths().stats, mobileStatsResponseSchema),
  })
}

export function useTeamsQuery() {
  return useQuery({
    queryKey: mobileQueryKeys().teams,
    queryFn: () =>
      mobileApiClient.get(mobileApiPaths().teams, z.array(mobileTeamListItemSchema)),
  })
}

export function useTeamQuery(seasonTeamId: string) {
  return useQuery({
    queryKey: mobileQueryKeys().team(seasonTeamId),
    queryFn: () => mobileApiClient.get(mobileApiPaths().team(seasonTeamId), mobileTeamDetailSchema),
    enabled: Boolean(seasonTeamId),
  })
}

export function usePlayerQuery(rosterEntryId: string) {
  return useQuery({
    queryKey: mobileQueryKeys().player(rosterEntryId),
    queryFn: () =>
      mobileApiClient.get(mobileApiPaths().player(rosterEntryId), mobilePlayerDetailSchema),
    enabled: Boolean(rosterEntryId),
  })
}

export function useArticlesQuery() {
  return useQuery({
    queryKey: mobileQueryKeys().articles,
    queryFn: () =>
      mobileApiClient.get(
        mobileApiPaths().articles,
        mobilePaginatedSchema(mobileArticleSummarySchema),
      ),
  })
}

export function useArticleQuery(articleId: string) {
  return useQuery({
    queryKey: mobileQueryKeys().article(articleId),
    queryFn: () => mobileApiClient.get(mobileApiPaths().article(articleId), mobileArticleDetailSchema),
    enabled: Boolean(articleId),
  })
}

export function useGalleriesQuery() {
  return useQuery({
    queryKey: mobileQueryKeys().galleries,
    queryFn: () =>
      mobileApiClient.get(
        mobileApiPaths().galleries,
        mobilePaginatedSchema(mobileGallerySummarySchema),
      ),
  })
}

export function useGalleryQuery(galleryId: string) {
  return useQuery({
    queryKey: mobileQueryKeys().gallery(galleryId),
    queryFn: () => mobileApiClient.get(mobileApiPaths().gallery(galleryId), mobileGalleryDetailSchema),
    enabled: Boolean(galleryId),
  })
}

export function useSponsorsQuery() {
  return useQuery({
    queryKey: mobileQueryKeys().sponsors,
    queryFn: () => mobileApiClient.get(mobileApiPaths().sponsors, z.array(mobileSponsorSchema)),
  })
}

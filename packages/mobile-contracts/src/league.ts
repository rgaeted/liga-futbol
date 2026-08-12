export type MobileLeagueConfig = {
  slug: string
  displayName: string
  shortName: string | null
  description: string | null
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  footballFormat: string
  season: {
    startDate: string
    endDate: string
  }
}

export type MobileHomeResponse = {
  league: MobileLeagueConfig
  featuredLiveMatch: import('./match.js').MobileMatchSummary | null
  upcomingMatches: import('./match.js').MobileMatchSummary[]
  recentResults: import('./match.js').MobileMatchSummary[]
  recentArticles: import('./content.js').MobileArticleSummary[]
  sponsors: import('./content.js').MobileSponsor[]
}

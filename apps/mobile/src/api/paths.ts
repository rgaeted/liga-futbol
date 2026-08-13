import { getLeagueSlug } from '../lib/runtime-config'

const API_PREFIX = '/api/mobile/v1/leagues'

export function mobileApiPaths(slug = getLeagueSlug()) {
  const base = `${API_PREFIX}/${slug}`
  return {
    league: `${base}`,
    home: `${base}/home`,
    matches: `${base}/matches`,
    match: (matchId: string) => `${base}/matches/${matchId}`,
    live: (matchId: string) => `${base}/matches/${matchId}/live`,
    standings: `${base}/standings`,
    stats: `${base}/stats`,
    teams: `${base}/teams`,
    team: (seasonTeamId: string) => `${base}/teams/${seasonTeamId}`,
    player: (rosterEntryId: string) => `${base}/players/${rosterEntryId}`,
    articles: `${base}/articles`,
    article: (articleId: string) => `${base}/articles/${articleId}`,
    galleries: `${base}/galleries`,
    gallery: (galleryId: string) => `${base}/galleries/${galleryId}`,
    sponsors: `${base}/sponsors`,
    installations: `${base}/installations`,
    installationSubscriptions: (installationId: string) =>
      `${base}/installations/${installationId}/subscriptions`,
  }
}

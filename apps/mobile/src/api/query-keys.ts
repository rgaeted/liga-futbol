import { getLeagueSlug } from '../lib/runtime-config'

export function mobileQueryKeys(slug = getLeagueSlug()) {
  const root = ['mobile', slug] as const
  return {
    all: root,
    league: [...root, 'league'] as const,
    home: [...root, 'home'] as const,
    matches: (filter?: string) => [...root, 'matches', filter ?? 'all'] as const,
    match: (matchId: string) => [...root, 'match', matchId] as const,
    live: (matchId: string) => [...root, 'live', matchId] as const,
    standings: [...root, 'standings'] as const,
    stats: [...root, 'stats'] as const,
    teams: [...root, 'teams'] as const,
    team: (seasonTeamId: string) => [...root, 'team', seasonTeamId] as const,
    player: (rosterEntryId: string) => [...root, 'player', rosterEntryId] as const,
    articles: [...root, 'articles'] as const,
    article: (articleId: string) => [...root, 'article', articleId] as const,
    galleries: [...root, 'galleries'] as const,
    gallery: (galleryId: string) => [...root, 'gallery', galleryId] as const,
    sponsors: [...root, 'sponsors'] as const,
  }
}

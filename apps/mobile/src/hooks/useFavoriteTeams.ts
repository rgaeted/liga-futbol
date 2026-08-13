import { useCallback, useEffect, useState } from 'react'
import { syncFavoriteTeamSubscriptions } from '../notifications/sync-subscriptions'
import {
  loadFavoriteTeams,
  toggleFavoriteTeam,
  type FavoriteTeamsState,
  isFavoriteTeam,
} from '../storage/favorites'

export function useFavoriteTeams() {
  const [state, setState] = useState<FavoriteTeamsState | null>(null)

  useEffect(() => {
    void loadFavoriteTeams().then(setState)
  }, [])

  const toggle = useCallback(async (seasonTeamId: string) => {
    const next = await toggleFavoriteTeam(seasonTeamId)
    setState(next)
    void syncFavoriteTeamSubscriptions(next.seasonTeamIds)
    return next
  }, [])

  return {
    state,
    isFavorite: (seasonTeamId: string) =>
      state ? isFavoriteTeam(state, seasonTeamId) : false,
    toggle,
  }
}

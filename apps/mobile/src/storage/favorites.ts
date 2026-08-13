import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from './keys'

export type FavoriteTeamsState = {
  seasonTeamIds: string[]
  updatedAt: string
}

const EMPTY_STATE: FavoriteTeamsState = {
  seasonTeamIds: [],
  updatedAt: new Date(0).toISOString(),
}

export async function loadFavoriteTeams(): Promise<FavoriteTeamsState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.favoriteTeams)
  if (!raw) return { ...EMPTY_STATE, updatedAt: new Date().toISOString() }

  try {
    const parsed = JSON.parse(raw) as FavoriteTeamsState
    if (!Array.isArray(parsed.seasonTeamIds)) return EMPTY_STATE
    return {
      seasonTeamIds: parsed.seasonTeamIds.filter((id) => typeof id === 'string'),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    }
  } catch {
    return EMPTY_STATE
  }
}

async function saveFavoriteTeams(state: FavoriteTeamsState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.favoriteTeams, JSON.stringify(state))
}

export async function toggleFavoriteTeam(seasonTeamId: string): Promise<FavoriteTeamsState> {
  const current = await loadFavoriteTeams()
  const exists = current.seasonTeamIds.includes(seasonTeamId)
  const seasonTeamIds = exists
    ? current.seasonTeamIds.filter((id) => id !== seasonTeamId)
    : [...current.seasonTeamIds, seasonTeamId]

  const next = {
    seasonTeamIds,
    updatedAt: new Date().toISOString(),
  }
  await saveFavoriteTeams(next)
  return next
}

export function isFavoriteTeam(state: FavoriteTeamsState, seasonTeamId: string): boolean {
  return state.seasonTeamIds.includes(seasonTeamId)
}

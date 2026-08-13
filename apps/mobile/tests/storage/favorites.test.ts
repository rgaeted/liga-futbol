import AsyncStorage from '@react-native-async-storage/async-storage'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadFavoriteTeams,
  toggleFavoriteTeam,
} from '../../src/storage/favorites'
import { STORAGE_KEYS } from '../../src/storage/keys'

describe('favorite teams storage', () => {
  beforeEach(() => {
    vi.mocked(AsyncStorage.getItem).mockReset()
    vi.mocked(AsyncStorage.setItem).mockReset()
  })

  it('returns an empty default state', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null)
    const state = await loadFavoriteTeams()
    expect(state.seasonTeamIds).toEqual([])
  })

  it('toggles favorites idempotently and preserves order', async () => {
    const store = new Map<string, string>()
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => store.get(key) ?? null)
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      store.set(key, value)
    })

    await toggleFavoriteTeam('st-1')
    await toggleFavoriteTeam('st-2')
    let state = await loadFavoriteTeams()
    expect(state.seasonTeamIds).toEqual(['st-1', 'st-2'])

    await toggleFavoriteTeam('st-1')
    state = await loadFavoriteTeams()
    expect(state.seasonTeamIds).toEqual(['st-2'])

    await toggleFavoriteTeam('st-1')
    state = await loadFavoriteTeams()
    expect(state.seasonTeamIds).toEqual(['st-2', 'st-1'])
  })

  it('falls back to empty state on corrupted storage', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('not-json')
    const state = await loadFavoriteTeams()
    expect(state.seasonTeamIds).toEqual([])
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.favoriteTeams)
  })
})

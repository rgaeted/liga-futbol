import { describe, it, expect } from 'vitest'
import {
  buildMatchTeamMvps,
  buildTeamMvpView,
  resolveTeamMvpLabel,
  resolveTeamMvpPhotoUrl,
  teamMvpPlayerIds,
} from '@/lib/match-mvp'
import { setMatchMvpSchema } from '@/lib/validations/mvp'

describe('resolveTeamMvpLabel', () => {
  it('returns league player name', () => {
    expect(
      resolveTeamMvpLabel({
        side: 'HOME',
        playerId: 'p-1',
        friendlyPlayerId: null,
        photoMimeType: null,
        photoData: null,
        player: { user: { name: 'Juan Pérez' } },
      })
    ).toBe('Juan Pérez')
  })

  it('returns friendly player name', () => {
    expect(
      resolveTeamMvpLabel({
        side: 'AWAY',
        playerId: null,
        friendlyPlayerId: 'fp-1',
        photoMimeType: null,
        photoData: null,
        friendlyPlayer: { firstName: 'Ana', lastName: 'López' },
      })
    ).toBe('Ana López')
  })
})

describe('buildMatchTeamMvps', () => {
  it('builds home and away slots', () => {
    const views = buildMatchTeamMvps({
      matchId: 'm-1',
      homeLabel: 'Local FC',
      awayLabel: 'Visita FC',
      rows: [
        {
          side: 'HOME',
          playerId: 'p-1',
          friendlyPlayerId: null,
          photoMimeType: null,
          photoData: null,
          player: { user: { name: 'Juan' } },
        },
      ],
    })

    expect(views).toHaveLength(2)
    expect(views[0]).toMatchObject({ side: 'HOME', label: 'Juan', teamLabel: 'Local FC' })
    expect(views[1]).toMatchObject({ side: 'AWAY', label: null })
  })
})

describe('resolveTeamMvpPhotoUrl', () => {
  it('prefers dedicated mvp photo', () => {
    expect(
      resolveTeamMvpPhotoUrl('m-1', {
        side: 'HOME',
        playerId: null,
        friendlyPlayerId: 'fp-1',
        photoMimeType: 'image/jpeg',
        photoData: Buffer.from('x'),
        friendlyPlayer: { firstName: 'Ana', lastName: 'López', photoMimeType: 'image/png' },
      })
    ).toBe('/api/matches/m-1/mvp/home/photo')
  })

  it('falls back to friendly player profile photo', () => {
    expect(
      resolveTeamMvpPhotoUrl('m-1', {
        side: 'HOME',
        playerId: null,
        friendlyPlayerId: 'fp-1',
        photoMimeType: null,
        photoData: null,
        friendlyPlayer: { firstName: 'Ana', lastName: 'López', photoMimeType: 'image/png' },
      })
    ).toBe('/api/friendly-players/fp-1/photo')
  })
})

describe('teamMvpPlayerIds', () => {
  it('collects player ids', () => {
    expect(
      teamMvpPlayerIds([
        buildTeamMvpView('m-1', 'HOME', 'Local', {
          side: 'HOME',
          playerId: 'p-1',
          friendlyPlayerId: null,
          photoMimeType: null,
          photoData: null,
          player: { user: { name: 'Juan' } },
        }),
        buildTeamMvpView('m-1', 'AWAY', 'Visita', null),
      ])
    ).toEqual(['p-1'])
  })
})

describe('setMatchMvpSchema', () => {
  it('accepts league mvp with side', () => {
    const result = setMatchMvpSchema.safeParse({ side: 'HOME', playerId: 'player-1' })
    expect(result.success).toBe(true)
  })

  it('accepts clearing mvp', () => {
    const result = setMatchMvpSchema.safeParse({ side: 'AWAY', playerId: null })
    expect(result.success).toBe(true)
  })

  it('rejects both ids', () => {
    const result = setMatchMvpSchema.safeParse({
      side: 'HOME',
      playerId: 'p-1',
      friendlyPlayerId: 'fp-1',
    })
    expect(result.success).toBe(false)
  })
})

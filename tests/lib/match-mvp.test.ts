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
  it('returns player name from person', () => {
    expect(
      resolveTeamMvpLabel({
        side: 'HOME',
        playerId: 'p-1',
        photoMimeType: null,
        photoData: null,
        player: {
          person: { firstName: 'Juan', lastName: 'Pérez', user: { name: 'Juan Pérez' } },
        },
      }),
    ).toBe('Juan Pérez')
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
          photoMimeType: null,
          photoData: null,
          player: {
            person: { firstName: 'Juan', lastName: '', user: { name: 'Juan' } },
          },
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
        playerId: 'p-1',
        photoMimeType: 'image/jpeg',
        photoData: Buffer.from('x'),
        player: { person: { photoMimeType: 'image/png' } },
      }),
    ).toBe('/api/matches/m-1/mvp/home/photo')
  })

  it('falls back to player person profile photo', () => {
    expect(
      resolveTeamMvpPhotoUrl('m-1', {
        side: 'HOME',
        playerId: 'p-1',
        photoMimeType: null,
        photoData: null,
        player: { person: { photoMimeType: 'image/png' } },
      }),
    ).toBe('/api/players/p-1/photo')
  })
})

describe('teamMvpPlayerIds', () => {
  it('collects player ids', () => {
    expect(
      teamMvpPlayerIds([
        buildTeamMvpView('m-1', 'HOME', 'Local', {
          side: 'HOME',
          playerId: 'p-1',
          photoMimeType: null,
          photoData: null,
          player: {
            person: { firstName: 'Juan', lastName: '', user: { name: 'Juan' } },
          },
        }),
        buildTeamMvpView('m-1', 'AWAY', 'Visita', null),
      ]),
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
})

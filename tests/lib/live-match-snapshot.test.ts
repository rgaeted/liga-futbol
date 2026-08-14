import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FootballFormat, MatchStatus, MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import {
  buildLiveMatchSnapshot,
  getLiveMatchSnapshot,
  type LiveMatchRecord,
} from '@/lib/live-match-snapshot'

vi.mock('@/lib/db', () => ({
  db: { match: { findUnique: vi.fn() } },
}))

const match = {
  id: 'match-1',
  organization: {
    name: 'Torneos Kelme',
    slug: 'kelme',
    logoStoragePath: null,
  },
  matchType: MatchType.LEAGUE,
  footballFormat: FootballFormat.FUTBOL_7,
  homeTeamId: 'home',
  awayTeamId: 'away',
  sideAName: null,
  sideBName: null,
  sideAColor: null,
  sideBColor: null,
  homeScore: 2,
  awayScore: 1,
  status: MatchStatus.LIVE,
  clockStartedAt: new Date('2026-08-03T20:00:00.000Z'),
  secondHalfStartedAt: null,
  halftimeAt: null,
  venue: 'Cancha Central',
  regionName: 'Región Metropolitana de Santiago',
  communeName: 'Santiago',
  weatherTempC: 18,
  weatherHumidityPct: 55,
  weatherWindKmh: 9,
  weatherLabel: 'Despejado',
  homeTeam: {
    id: 'home',
    name: 'Local',
    color: '#CD212A',
    crestMimeType: null,
    crestData: null,
    coach: { name: 'DT Local' },
  },
  awayTeam: {
    id: 'away',
    name: 'Visita',
    color: '#008C45',
    crestMimeType: null,
    crestData: null,
    coach: { name: 'DT Visita' },
  },
  formations: [],
  callUps: [],
  friendlyPlayers: [],
  teamMvps: [],
  events: [
    {
      id: 'event-1',
      type: 'GOAL',
      minute: 12,
      createdAt: new Date('2026-08-03T20:12:00.000Z'),
      teamId: 'home',
      side: null,
      friendlyPlayerId: null,
      player: {
        teamId: 'home',
        person: { firstName: 'Jugador', lastName: 'Local', user: { name: 'Jugador Local' } },
        team: { id: 'home', name: 'Local' },
      },
      friendlyPlayer: null,
      assistPlayer: {
        person: { firstName: 'Asistente', lastName: 'Local', user: { name: 'Asistente Local' } },
      },
      assistFriendlyPlayer: null,
      description: 'Golazo de rabona',
    },
  ],
} as unknown as LiveMatchRecord

describe('live match snapshot', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when the match does not exist', async () => {
    vi.mocked(db.match.findUnique).mockResolvedValue(null)
    await expect(getLiveMatchSnapshot('missing')).resolves.toBeNull()
  })

  it('returns null when the organization slug does not match', async () => {
    vi.mocked(db.match.findUnique).mockResolvedValue(match)
    await expect(getLiveMatchSnapshot('match-1', 'other-org')).resolves.toBeNull()
  })

  it('preserves the complete public LiveScoreboard DTO', () => {
    const snapshot = buildLiveMatchSnapshot(match)

    expect(snapshot).toMatchObject({
      id: 'match-1',
      organization: { name: 'Torneos Kelme', logoUrl: null },
      guestOrganization: null,
      matchType: MatchType.LEAGUE,
      homeTeamId: 'home',
      awayTeamId: 'away',
      sideAName: null,
      sideBName: null,
      preferCreatedAtOrder: false,
      friendlySideByPlayer: {},
      friendlyPaidByPlayerId: {},
      friendlyGalletaPlayerIds: [],
      homeScore: 2,
      awayScore: 1,
      homeTeam: { name: 'Local', color: '#CD212A', crestSrc: null },
      awayTeam: { name: 'Visita', color: '#008C45', crestSrc: null },
      clock: {
        status: MatchStatus.LIVE,
        clockStartedAt: '2026-08-03T20:00:00.000Z',
        secondHalfStartedAt: null,
        halftimeAt: null,
      },
      events: [
        {
          id: 'event-1',
          playerName: 'Jugador Local',
          assistName: 'Asistente Local',
          description: 'Golazo de rabona',
          teamName: 'Local',
          teamColor: '#CD212A',
        },
      ],
      homeCoachLabel: 'DT Local',
      awayCoachLabel: 'DT Visita',
      venue: 'Cancha Central',
      locationLabel: 'Santiago, Región Metropolitana de Santiago',
      weather: {
        label: 'Despejado',
        tempC: 18,
        humidityPct: 55,
        windKmh: 9,
      },
    })
  })

  it('maps friendly payment status by player id', () => {
    const friendlyMatch = {
      ...match,
      matchType: MatchType.FRIENDLY,
      homeTeamId: null,
      awayTeamId: null,
      sideAName: 'Blancos',
      sideBName: 'Negros',
      friendlyPlayers: [
        {
          friendlyPlayerId: 'fp-1',
          side: 'A',
          slotKey: null,
          paid: true,
          isGalleta: true,
          isCaptain: false,
          isCoach: false,
          friendlyPlayer: {
            firstName: 'Juan',
            lastName: 'Pérez',
            photoMimeType: 'image/jpeg',
          },
        },
        {
          friendlyPlayerId: 'fp-2',
          side: 'B',
          slotKey: null,
          paid: false,
          isGalleta: false,
          isCaptain: false,
          isCoach: false,
          friendlyPlayer: {
            firstName: 'Pedro',
            lastName: 'Gómez',
            photoMimeType: null,
          },
        },
      ],
    } as unknown as LiveMatchRecord

    const snapshot = buildLiveMatchSnapshot(friendlyMatch)

    expect(snapshot.friendlyPaidByPlayerId).toEqual({
      'fp-1': true,
      'fp-2': false,
    })
    expect(snapshot.friendlyGalletaPlayerIds).toEqual(['fp-1'])
  })

  it('includes guest organization branding on challenge friendlies', () => {
    const challengeMatch = {
      ...match,
      matchType: MatchType.FRIENDLY,
      homeTeamId: null,
      awayTeamId: null,
      sideAName: 'Kelme',
      sideBName: 'Rival FC',
      guestOrganization: {
        name: 'Rival FC',
        logoStoragePath: 'orgs/rival/logo.png',
      },
      friendlyPlayers: [],
    } as unknown as LiveMatchRecord

    const snapshot = buildLiveMatchSnapshot(challengeMatch)

    expect(snapshot.guestOrganization).toEqual({
      name: 'Rival FC',
      logoUrl: null,
    })
    expect(snapshot.awayTeam.crestSrc).toBeNull()
  })

  it('returns null when slug does not match host organization', async () => {
    const kelmeMatch = {
      ...match,
      organization: { name: 'Kelme', slug: 'kelme', logoStoragePath: null },
    } as unknown as LiveMatchRecord
    vi.mocked(db.match.findUnique).mockResolvedValue(kelmeMatch)
    await expect(getLiveMatchSnapshot('match-1', 'other')).resolves.toBeNull()
  })
})

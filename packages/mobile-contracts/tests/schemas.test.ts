import { describe, expect, it } from 'vitest'
import {
  mobileMatchSummarySchema,
  mobilePushDataSchema,
  registerInstallationRequestSchema,
  replaceSubscriptionsRequestSchema,
} from '../src/schemas'

const validTeamRef = {
  seasonTeamId: 'st-1',
  teamId: 't-1',
  name: 'Rojo',
  color: '#CD212A',
  crestUrl: null,
  initials: 'RO',
}

describe('mobileMatchSummarySchema', () => {
  it('rejects a response without season-scoped team ids', () => {
    expect(() =>
      mobileMatchSummarySchema.parse({
        id: 'match-1',
        scheduledAt: '2026-08-20T23:30:00.000Z',
        status: 'SCHEDULED',
        home: { name: 'Rojo', color: '#CD212A' },
        away: { name: 'Negro', color: '#111111' },
        homeScore: 0,
        awayScore: 0,
      }),
    ).toThrow()
  })

  it('accepts a valid match summary', () => {
    const parsed = mobileMatchSummarySchema.parse({
      id: 'match-1',
      scheduledAt: '2026-08-20T23:30:00.000Z',
      status: 'SCHEDULED',
      statusLabel: 'Programado',
      home: validTeamRef,
      away: { ...validTeamRef, seasonTeamId: 'st-2', teamId: 't-2', name: 'Negro', color: '#111111', initials: 'NE' },
      homeScore: 0,
      awayScore: 0,
      venue: null,
      locationLabel: null,
    })
    expect(parsed.home.seasonTeamId).toBe('st-1')
  })
})

describe('registerInstallationRequestSchema', () => {
  it.each(['ExpoPushToken[abc]', 'ExponentPushToken[abc]'])('accepts Expo token %s', (token) => {
    expect(
      registerInstallationRequestSchema.safeParse({
        installationId: crypto.randomUUID(),
        expoPushToken: token,
        platform: 'IOS',
      }).success,
    ).toBe(true)
  })
})

describe('replaceSubscriptionsRequestSchema', () => {
  it('rejects more than twenty team subscriptions', () => {
    const teams = Array.from({ length: 21 }, (_, index) => ({
      seasonTeamId: `st-${index + 1}`,
    }))
    expect(replaceSubscriptionsRequestSchema.safeParse({ teams }).success).toBe(false)
  })
})

describe('mobilePushDataSchema', () => {
  it('accepts a match deep link payload', () => {
    expect(
      mobilePushDataSchema.parse({
        type: 'match',
        slug: 'liga-invierno-kelme-puerto-varas-2026',
        matchId: 'm1',
        kind: 'GOAL',
        path: '/matches/m1',
      }),
    ).toEqual({
      type: 'match',
      slug: 'liga-invierno-kelme-puerto-varas-2026',
      matchId: 'm1',
      kind: 'GOAL',
      path: '/matches/m1',
    })
  })
})

import { describe, expect, it } from 'vitest'
import { mobileMatchSummarySchema } from '../src/schemas'

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

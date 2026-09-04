import { describe, expect, it } from 'vitest'
import {
  formLastFive,
  orgMonogram,
  sidesAreReady,
  splitOrgHeadline,
  tallyRecentAssists,
  tallyRecentScorers,
  teamKitColorFromName,
  teamToneFromName,
} from '@/lib/org-public-landing'

describe('tallyRecentScorers', () => {
  it('counts GOAL only and ignores OWN_GOAL', () => {
    const scorers = tallyRecentScorers([
      { type: 'GOAL', playerId: 'p1', playerName: 'Ana' },
      { type: 'GOAL', playerId: 'p1', playerName: 'Ana' },
      { type: 'OWN_GOAL', playerId: 'p1', playerName: 'Ana' },
      { type: 'YELLOW_CARD', playerId: 'p2', playerName: 'Ben' },
    ])
    expect(scorers).toEqual([{ name: 'Ana', goals: 2 }])
  })

  it('takes top 5 by goals then name', () => {
    const events = Array.from({ length: 6 }, (_, i) => ({
      type: 'GOAL',
      playerId: `p${i}`,
      playerName: `J${i}`,
    })).concat(
      Array.from({ length: 3 }, () => ({
        type: 'GOAL',
        playerId: 'p0',
        playerName: 'J0',
      })),
    )
    const scorers = tallyRecentScorers(events, 5)
    expect(scorers).toHaveLength(5)
    expect(scorers[0]).toEqual({ name: 'J0', goals: 4 })
  })
})

describe('tallyRecentAssists', () => {
  it('counts assists on GOAL events only when assistPlayerId is set', () => {
    const assists = tallyRecentAssists([
      { type: 'GOAL', assistPlayerId: 'p1', assistName: 'Ana' },
      { type: 'GOAL', assistPlayerId: 'p1', assistName: 'Ana' },
      { type: 'GOAL', assistPlayerId: null, assistName: null },
      { type: 'OWN_GOAL', assistPlayerId: 'p1', assistName: 'Ana' },
    ])
    expect(assists).toEqual([{ name: 'Ana', assists: 2 }])
  })

  it('takes top 5 by assists then name', () => {
    const events = Array.from({ length: 6 }, (_, i) => ({
      type: 'GOAL',
      assistPlayerId: `p${i}`,
      assistName: `J${i}`,
    })).concat(
      Array.from({ length: 3 }, () => ({
        type: 'GOAL',
        assistPlayerId: 'p0',
        assistName: 'J0',
      })),
    )
    const assists = tallyRecentAssists(events, 5)
    expect(assists).toHaveLength(5)
    expect(assists[0]).toEqual({ name: 'J0', assists: 4 })
  })
})

describe('landing presentation helpers', () => {
  it('splits org headlines and monograms', () => {
    expect(splitOrgHeadline('Partidos Los Lunes')).toEqual({
      first: 'Partidos',
      rest: 'Los Lunes',
    })
    expect(orgMonogram('Partidos Los Lunes')).toBe('PL')
  })

  it('detects Blancos/Negros tones', () => {
    expect(teamToneFromName('Blancos', 'away')).toBe('white')
    expect(teamToneFromName('Negros', 'home')).toBe('black')
    expect(teamToneFromName('Colo Colo', 'home')).toBe('white')
    expect(teamToneFromName('Católica', 'away')).toBe('black')
  })

  it('maps Blancos/Negros to kit colors for generated crests', () => {
    expect(teamKitColorFromName('Blancos')).toBe('#F5F5F5')
    expect(teamKitColorFromName('Negros')).toBe('#1A1A1A')
    expect(teamKitColorFromName('Colo Colo')).toBeNull()
  })

  it('treats placeholder sides as not ready', () => {
    expect(sidesAreReady('Blancos', 'Negros')).toBe(true)
    expect(sidesAreReady('Lado A', 'Lado B')).toBe(false)
  })

  it('counts last-five form for one side', () => {
    const form = formLastFive(
      [
        { home: 'Blancos', away: 'Negros', homeScore: 6, awayScore: 2 },
        { home: 'Blancos', away: 'Negros', homeScore: 6, awayScore: 0 },
        { home: 'Blancos', away: 'Negros', homeScore: 4, awayScore: 6 },
      ],
      'Blancos',
    )
    expect(form).toEqual({
      teamName: 'Blancos',
      wins: 2,
      marks: ['W', 'W', 'L'],
    })
  })
})

describe('public landing payload keys', () => {
  it('fixture JSON does not include paid or email', () => {
    const fixture = {
      organization: {
        name: 'X',
        slug: 'x',
        primaryColor: '#fff',
        logoUrl: null,
        monogram: 'X',
        headline: { first: 'X', rest: null },
      },
      featured: null,
      live: [],
      nextMatch: null,
      results: [],
      form: null,
      scorers: [{ name: 'Ana', goals: 1 }],
      assists: [{ name: 'Ben', assists: 2 }],
      awards: [
        {
          name: 'Premio al 7 pulmones',
          shortLabel: '7 pulmones',
          emoji: '🫁',
          description: null,
          accentColor: '#16A34A',
          recipientCount: 1,
          recipients: [{ name: 'Ana' }],
        },
      ],
      awardLeaders: [{ name: 'Ana', awards: 1 }],
    }
    const raw = JSON.stringify(fixture)
    expect(raw).not.toMatch(/paid/i)
    expect(raw).not.toMatch(/email/i)
  })
})

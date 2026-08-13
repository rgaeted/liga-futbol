import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LiveScoreboard } from '../../src/components/match/LiveScoreboard'

describe('match detail', () => {
  it('shows scoreboard teams and score', () => {
    render(
      <LiveScoreboard
        snapshot={{
          id: 'm-1',
          status: 'LIVE',
          home: {
            seasonTeamId: 'st-1',
            teamId: 't-1',
            name: 'Rojo',
            color: '#CD212A',
            crestUrl: null,
            initials: 'RO',
          },
          away: {
            seasonTeamId: 'st-2',
            teamId: 't-2',
            name: 'Negro',
            color: '#111111',
            crestUrl: null,
            initials: 'NE',
          },
          homeScore: 2,
          awayScore: 1,
          clock: {
            status: 'LIVE',
            clockStartedAt: '2026-08-20T23:00:00.000Z',
            secondHalfStartedAt: null,
            halftimeAt: null,
          },
          events: [],
          venue: null,
          locationLabel: null,
          weather: null,
        }}
      />,
    )

    expect(screen.getByText('Rojo')).toBeTruthy()
    expect(screen.getByText('2 - 1')).toBeTruthy()
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamCard } from '../../src/components/teams/TeamCard'
import { RosterList } from '../../src/components/teams/RosterList'

describe('teams screen', () => {
  it('falls back to initials when crest is null', () => {
    render(
      <TeamCard
        team={{
          seasonTeamId: 'st-1',
          teamId: 't-1',
          name: 'Rojo',
          color: '#CD212A',
          crestUrl: null,
          initials: 'RO',
          nextMatchAt: null,
        }}
      />,
    )
    expect(screen.getByText('RO')).toBeTruthy()
  })

  it('shows roster snapshot values', () => {
    render(
      <RosterList
        roster={[
          {
            rosterEntryId: 're-1',
            playerId: 'p-1',
            name: 'Juan Pérez',
            jerseyNumber: 9,
            position: 'Delantero',
            stats: { goals: 2, assists: 1, yellowCards: 0, redCards: 0, mvpCount: 0 },
          },
        ]}
      />,
    )
    expect(screen.getByText('Juan Pérez')).toBeTruthy()
    expect(screen.getByText('#9 · Delantero')).toBeTruthy()
    expect(screen.getByText('2G · 1A')).toBeTruthy()
  })
})

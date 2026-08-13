import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StandingsTable } from '../../src/components/standings/StandingsTable'

describe('standings screen data', () => {
  it('renders all standing columns and favorite highlight label', () => {
    render(
      <StandingsTable
        favoriteTeamIds={['st-1']}
        rows={[
          {
            rank: 1,
            seasonTeamId: 'st-1',
            teamId: 't-1',
            name: 'Rojo',
            color: '#CD212A',
            crestUrl: null,
            pj: 1,
            pg: 1,
            pe: 0,
            pp: 0,
            gf: 2,
            gc: 0,
            dg: 2,
            pts: 3,
          },
        ]}
      />,
    )

    expect(screen.getByText('Equipo')).toBeTruthy()
    expect(screen.getByText('Pts')).toBeTruthy()
    expect(screen.getByLabelText('Rojo, equipo favorito')).toBeTruthy()
  })
})

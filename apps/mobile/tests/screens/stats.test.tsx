import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatsTabs } from '../../src/components/stats/StatsTabs'

describe('stats screen', () => {
  it('shows stat categories', () => {
    render(
      <StatsTabs
        stats={{
          scorers: [
            {
              rosterEntryId: 're-1',
              playerId: 'p-1',
              playerName: 'Juan Pérez',
              teamName: 'Rojo',
              jerseyNumber: 10,
              position: 'Delantero',
              value: 3,
              stats: { goals: 3, assists: 0, yellowCards: 0, redCards: 0, mvpCount: 0 },
            },
          ],
          assists: [],
          yellowCards: [],
          redCards: [],
          mvps: [],
        }}
      />,
    )

    expect(screen.getByText('Goles')).toBeTruthy()
    expect(screen.getByText('Asistencias')).toBeTruthy()
    fireEvent.click(screen.getByText('Goles'))
    expect(screen.getByText('Juan Pérez')).toBeTruthy()
  })
})

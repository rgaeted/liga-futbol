import { describe, it, expect } from 'vitest'
import {
  calculateFormationFit,
  playerPositionBand,
  positionFitScore,
  slotPositionBand,
} from '@/lib/formation-position-fit'

describe('formation-position-fit', () => {
  it('maps friendly and free-text positions to bands', () => {
    expect(playerPositionBand('Delantero')).toBe(3)
    expect(playerPositionBand('Defensa central')).toBe(1)
    expect(playerPositionBand('Arquero')).toBe(0)
    expect(playerPositionBand('volante')).toBe(2)
  })

  it('penalizes forwards placed in defense', () => {
    expect(positionFitScore(1, 3)).toBe(35)
  })

  it('rewards matching bands', () => {
    expect(positionFitScore(3, 3)).toBe(100)
  })

  it('uses formation slot rows for slot band', () => {
    expect(slotPositionBand('ST', '4-3-3', 'FUTBOL_11')).toBe(3)
    expect(slotPositionBand('CB_L', '4-3-3', 'FUTBOL_11')).toBe(1)
    expect(slotPositionBand('GK', '4-3-3', 'FUTBOL_11')).toBe(0)
  })

  it('calculates average fit for a lineup', () => {
    const result = calculateFormationFit({
      scheme: '4-3-3',
      footballFormat: 'FUTBOL_11',
      slots: {
        ST: 'fwd',
        CB_L: 'def',
      },
      players: [
        { id: 'fwd', label: 'Juan', primaryPosition: 'Delantero' },
        { id: 'def', label: 'Pedro', primaryPosition: 'Delantero' },
      ],
    })

    expect(result.percentage).toBe(68)
    expect(result.mismatches).toHaveLength(1)
    expect(result.mismatches[0]?.playerLabel).toBe('Pedro')
  })

  it('considers secondary position when it fits better', () => {
    const result = calculateFormationFit({
      scheme: '4-3-3',
      footballFormat: 'FUTBOL_11',
      slots: { CB_L: 'p1' },
      players: [
        {
          id: 'p1',
          label: 'Ana',
          primaryPosition: 'Delantero',
          secondaryPosition: 'Defensa central',
        },
      ],
    })

    expect(result.percentage).toBe(100)
  })
})

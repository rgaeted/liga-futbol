import { describe, expect, it } from 'vitest'
import {
  chileYear,
  ladoDeJugador,
  minutoPrimerTiempo,
  minutoTotalDePartido,
  scoresAfterEvents,
} from '@/lib/badges/context'

describe('minutoTotalDePartido', () => {
  it('uses FULLTIME minute when present', () => {
    expect(
      minutoTotalDePartido([
        { id: '1', type: 'GOAL', minute: 12, playerId: 'p', assistPlayerId: null, side: 'A' },
        { id: '2', type: 'FULLTIME', minute: 58, playerId: null, assistPlayerId: null, side: null },
      ]),
    ).toBe(58)
  })

  it('floors at 60 when the sheet is short', () => {
    expect(
      minutoTotalDePartido([
        { id: '1', type: 'GOAL', minute: 12, playerId: 'p', assistPlayerId: null, side: 'A' },
      ]),
    ).toBe(60)
  })
})

describe('scoresAfterEvents', () => {
  it('applies own goals to the opposite side', () => {
    const events = [
      { id: '1', type: 'GOAL', minute: 10, playerId: 'a', assistPlayerId: null, side: 'A' as const },
      { id: '2', type: 'OWN_GOAL', minute: 20, playerId: 'a', assistPlayerId: null, side: 'A' as const },
    ]
    const map = scoresAfterEvents(events)
    expect(map.get('1')).toEqual({ a: 1, b: 0 })
    expect(map.get('2')).toEqual({ a: 1, b: 1 })
  })
})

describe('ladoDeJugador', () => {
  it('reads the roster side', () => {
    expect(
      ladoDeJugador(
        [{ playerId: 'p1', side: 'B', primaryPosition: null, position: null }],
        'p1',
      ),
    ).toBe('B')
  })
})

describe('chileYear', () => {
  it('uses America/Santiago', () => {
    expect(chileYear(new Date('2026-01-01T02:00:00.000Z'))).toBe(2025)
  })
})

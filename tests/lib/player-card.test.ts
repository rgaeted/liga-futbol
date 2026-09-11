import { describe, expect, it } from 'vitest'
import {
  calcularCarta,
  cardPositionFromPlayer,
  normalizar,
  percentile,
  playerCardShortName,
  seedJitter,
} from '@/lib/player-card'

describe('normalizar', () => {
  it('returns the mid range when the league is homogeneous', () => {
    expect(normalizar(1, 2, 2)).toBe(70)
  })

  it('maps p10 to the floor and p90 to the ceiling', () => {
    expect(normalizar(0, 0, 2)).toBe(40)
    expect(normalizar(2, 0, 2)).toBe(99)
  })

  it('clamps outside the p10/p90 window', () => {
    expect(normalizar(-1, 0, 2)).toBe(40)
    expect(normalizar(9, 0, 2)).toBe(99)
  })
})

describe('percentile', () => {
  it('reads p10 and p90 from a sorted-or-unsorted list', () => {
    const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    expect(percentile(values, 0.1)).toBe(0.9)
    expect(percentile(values, 0.9)).toBe(8.1)
  })
})

describe('cardPositionFromPlayer', () => {
  it('maps friendly labels to DEL/MED/DEF/POR', () => {
    expect(cardPositionFromPlayer('Delantero', null)).toBe('DEL')
    expect(cardPositionFromPlayer('Arquero', null)).toBe('POR')
    expect(cardPositionFromPlayer('Defensa central', null)).toBe('DEF')
    expect(cardPositionFromPlayer(null, 'Mediocampista')).toBe('MED')
  })

  it('defaults to MED when missing', () => {
    expect(cardPositionFromPlayer(null, null)).toBe('MED')
    expect(cardPositionFromPlayer('   ', null)).toBe('MED')
  })
})

describe('playerCardShortName', () => {
  it('uses first initial plus last name', () => {
    expect(playerCardShortName('Fernando Opitz')).toBe('F. Opitz')
    expect(playerCardShortName('Ana')).toBe('Ana')
  })
})

describe('calcularCarta', () => {
  const base = {
    playerId: 'player-opitz',
    primaryPosition: 'Delantero',
    pj: 3,
    goles: 7,
    asistencias: 5,
    presencias: 4,
    fechasPosibles: 5,
    mvps: 2,
    rojas: 0,
    rachaGoleadora: 3,
    rachaPresencia: 5,
    p10GolesPorPartido: 0,
    p90GolesPorPartido: 2.8,
    p10AsistPorPartido: 0.2,
    p90AsistPorPartido: 2.3,
  }

  it('builds a complete card in the Opitz band with fixed percentiles', () => {
    const card = calcularCarta(base)
    const gpp = 7 / 3
    const app = 5 / 3
    expect(card.estado).toBe('completa')
    expect(card.posicion).toBe('DEL')
    expect(card.atributos.TIR).toBe(normalizar(gpp, 0, 2.8))
    expect(card.atributos.VIS).toBe(normalizar(app, 0.2, 2.3))
    expect(card.atributos.TIR).toBeGreaterThanOrEqual(80)
    expect(card.atributos.VIS).toBeGreaterThanOrEqual(75)
    expect(card.atributos.RES).toBe(89)
    expect(card.ovr).toBeTypeOf('number')
    expect(card.atributos.REG).toBeLessThanOrEqual(95)
    expect(card.atributos.RIT).toBeLessThanOrEqual(95)
    expect(card.atributos.FIS).toBeLessThanOrEqual(95)
  })

  it('marks en_formacion under MIN_PJ and nulls TIR/VIS/OVR', () => {
    const card = calcularCarta({ ...base, pj: 1, goles: 1, asistencias: 0 })
    expect(card.estado).toBe('en_formacion')
    expect(card.atributos.TIR).toBeNull()
    expect(card.atributos.VIS).toBeNull()
    expect(card.ovr).toBeNull()
    expect(card.partidosFaltantes).toBe(1)
    expect(card.atributos.REG).toBeGreaterThan(0)
  })

  it('keeps seed jitter stable and distinct per attribute', () => {
    expect(seedJitter('abc', 'REG')).toBe(seedJitter('abc', 'REG'))
    expect(new Set(['REG', 'RIT', 'FIS'].map((a) => seedJitter('abc', a as 'REG'))).size).toBeGreaterThan(1)
  })
})

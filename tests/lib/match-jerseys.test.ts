import { describe, it, expect } from 'vitest'
import { effectiveJersey, jerseyLabel } from '@/lib/match-jerseys'
import { setMatchJerseySchema } from '@/lib/validations/match-jersey'

describe('effectiveJersey', () => {
  it('prefiere el dorsal del partido', () => expect(effectiveJersey(5, 9)).toBe(5))
  it('usa el permanente si no hay del partido', () => expect(effectiveJersey(undefined, 9)).toBe(9))
  it('devuelve null sin ninguno', () => expect(effectiveJersey(null, null)).toBeNull())
  it('trata 0 como valido', () => expect(effectiveJersey(0, 9)).toBe(0))
})

describe('jerseyLabel', () => {
  it('antepone el dorsal', () => expect(jerseyLabel('Ana Pérez', 7)).toBe('#7 Ana Pérez'))
  it('usa guion sin dorsal', () => expect(jerseyLabel('Ana Pérez', null)).toBe('#— Ana Pérez'))
})

describe('setMatchJerseySchema', () => {
  it.each([0, 99, null])('acepta %s', (number) => {
    expect(setMatchJerseySchema.safeParse({ playerId: 'p', number }).success).toBe(true)
  })
  it.each([100, -1, 1.5])('rechaza %s', (number) => {
    expect(setMatchJerseySchema.safeParse({ playerId: 'p', number }).success).toBe(false)
  })
  it('rechaza playerId vacio', () => {
    expect(setMatchJerseySchema.safeParse({ playerId: '', number: 3 }).success).toBe(false)
  })
})

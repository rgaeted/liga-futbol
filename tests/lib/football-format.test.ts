import { describe, it, expect } from 'vitest'
import { minCallUpSize, playersOnPitch, footballFormatLabel } from '@/lib/football-format'

describe('football format helpers', () => {
  it('labels formats in Spanish', () => {
    expect(footballFormatLabel('FUTBOL_11')).toBe('Fútbol 11')
    expect(footballFormatLabel('FUTBOL_7')).toBe('Fútbol 7')
    expect(footballFormatLabel('FUTBOL_6')).toBe('Fútbol 6')
    expect(footballFormatLabel('FUTBOL_5')).toBe('Fútbol 5')
  })

  it('defines min call-up sizes', () => {
    expect(minCallUpSize('FUTBOL_5')).toBe(5)
    expect(minCallUpSize('FUTBOL_6')).toBe(6)
    expect(minCallUpSize('FUTBOL_7')).toBe(7)
    expect(minCallUpSize('FUTBOL_11')).toBe(7)
  })

  it('defines players on pitch', () => {
    expect(playersOnPitch('FUTBOL_5')).toBe(5)
    expect(playersOnPitch('FUTBOL_6')).toBe(6)
    expect(playersOnPitch('FUTBOL_7')).toBe(7)
    expect(playersOnPitch('FUTBOL_11')).toBe(11)
  })
})

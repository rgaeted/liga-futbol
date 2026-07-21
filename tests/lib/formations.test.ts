import { describe, it, expect } from 'vitest'
import {
  FORMATION_SCHEMES,
  getDefaultScheme,
  getFormationSchemes,
  getFormationSlots,
  isValidScheme,
  isValidSlotKey,
  assertUniqueSlotAssignments,
} from '@/lib/formations'

describe('formations catalog', () => {
  it('includes 4-3-3 for fútbol 11', () => {
    expect(FORMATION_SCHEMES).toContain('4-3-3')
    expect(getFormationSchemes('FUTBOL_11')).toContain('4-3-3')
  })

  it('4-3-3 has 11 slots including GK', () => {
    const slots = getFormationSlots('4-3-3', 'FUTBOL_11')
    expect(slots).toHaveLength(11)
    expect(slots[0].key).toBe('GK')
    expect(slots.every((s) => typeof s.row === 'number' && typeof s.col === 'number')).toBe(true)
  })

  it('fútbol 7 uses 7-player schemes', () => {
    const scheme = getDefaultScheme('FUTBOL_7')
    expect(isValidScheme(scheme, 'FUTBOL_7')).toBe(true)
    expect(getFormationSlots(scheme, 'FUTBOL_7')).toHaveLength(7)
  })

  it('fútbol 5 uses 5-player schemes', () => {
    const scheme = getDefaultScheme('FUTBOL_5')
    expect(isValidScheme(scheme, 'FUTBOL_5')).toBe(true)
    expect(getFormationSlots(scheme, 'FUTBOL_5')).toHaveLength(5)
  })

  it('rejects fútbol 11 scheme for fútbol 5', () => {
    expect(isValidScheme('4-3-3', 'FUTBOL_5')).toBe(false)
  })

  it('rejects unknown scheme slot keys', () => {
    expect(isValidSlotKey('4-3-3', 'GK', 'FUTBOL_11')).toBe(true)
    expect(isValidSlotKey('4-3-3', 'NOPE', 'FUTBOL_11')).toBe(false)
  })

  it('detects duplicate slot assignments', () => {
    const result = assertUniqueSlotAssignments([
      { slotKey: 'GK', playerId: 'p1' },
      { slotKey: 'GK', playerId: 'p2' },
    ])
    expect(result.ok).toBe(false)
  })

  it('accepts unique slot assignments', () => {
    const result = assertUniqueSlotAssignments([
      { slotKey: 'GK', playerId: 'p1' },
      { slotKey: 'ST', playerId: 'p2' },
    ])
    expect(result.ok).toBe(true)
  })
})

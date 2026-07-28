import { describe, expect, it } from 'vitest'
import {
  formatChileLocation,
  listChileCommunes,
  listChileRegions,
  resolveChileLocationInput,
  validateChileLocationPair,
} from '@/lib/chile-locations'

describe('chile-locations', () => {
  it('lists all regions', () => {
    const regions = listChileRegions()
    expect(regions.length).toBeGreaterThan(10)
    expect(regions.some((r) => r.code === '13' && r.name === 'Metropolitana')).toBe(true)
  })

  it('lists communes for a region', () => {
    const communes = listChileCommunes('13')
    expect(communes.length).toBeGreaterThan(0)
    expect(communes.some((c) => c.name === 'Santiago Centro')).toBe(true)
  })

  it('resolves a valid region and commune pair', () => {
    const santiago = listChileCommunes('13').find((c) => c.name === 'Santiago Centro')!
    const resolved = resolveChileLocationInput({
      regionCode: '13',
      communeCode: santiago.code,
    })
    expect(resolved).toMatchObject({
      regionName: 'Metropolitana',
      communeName: 'Santiago Centro',
      communeLat: expect.any(Number),
      communeLon: expect.any(Number),
    })
  })

  it('returns null when both fields are empty', () => {
    expect(resolveChileLocationInput({})).toBeNull()
    expect(validateChileLocationPair(null, null)).toBeNull()
  })

  it('rejects mismatched region and commune', () => {
    const santiago = listChileCommunes('13').find((c) => c.name === 'Santiago Centro')!
    const resolved = resolveChileLocationInput({
      regionCode: '05',
      communeCode: santiago.code,
    })
    expect(resolved).toEqual({ error: 'La comuna no pertenece a la región seleccionada' })
  })

  it('formats location label', () => {
    expect(formatChileLocation('Metropolitana', 'Santiago')).toBe('Santiago, Metropolitana')
    expect(formatChileLocation(null, null)).toBeNull()
  })
})

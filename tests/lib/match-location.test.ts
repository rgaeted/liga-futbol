import { describe, expect, it } from 'vitest'
import { buildMatchLocationFields, clearMatchWeatherFields } from '@/lib/match-location'
import { listChileCommunes } from '@/lib/chile-locations'

describe('match-location', () => {
  it('clears weather fields', () => {
    expect(clearMatchWeatherFields()).toEqual({
      weatherTempC: null,
      weatherHumidityPct: null,
      weatherWindKmh: null,
      weatherCode: null,
      weatherLabel: null,
      weatherFetchedAt: null,
    })
  })

  it('builds location fields and clears weather when location is set', () => {
    const santiago = listChileCommunes('13').find((c) => c.name === 'Santiago Centro')!
    const fields = buildMatchLocationFields({
      regionCode: '13',
      communeCode: santiago.code,
    })
    expect(fields).toMatchObject({
      regionName: 'Metropolitana',
      communeName: 'Santiago Centro',
      weatherTempC: null,
      weatherLabel: null,
    })
  })

  it('clears location when both codes are empty', () => {
    const fields = buildMatchLocationFields({ regionCode: null, communeCode: null })
    expect(fields).toMatchObject({
      regionCode: null,
      communeCode: null,
      communeLat: null,
      weatherLabel: null,
    })
  })
})

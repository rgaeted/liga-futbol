import { resolveChileLocationInput } from '@/lib/chile-locations'

export const MATCH_WEATHER_FIELDS = [
  'weatherTempC',
  'weatherHumidityPct',
  'weatherWindKmh',
  'weatherCode',
  'weatherLabel',
  'weatherFetchedAt',
] as const

export function clearMatchWeatherFields() {
  return {
    weatherTempC: null,
    weatherHumidityPct: null,
    weatherWindKmh: null,
    weatherCode: null,
    weatherLabel: null,
    weatherFetchedAt: null,
  }
}

export function buildMatchLocationFields(input: {
  regionCode?: string | null
  communeCode?: string | null
}):
  | {
      regionCode: string | null
      regionName: string | null
      communeCode: string | null
      communeName: string | null
      communeLat: number | null
      communeLon: number | null
      weatherTempC: null
      weatherHumidityPct: null
      weatherWindKmh: null
      weatherCode: null
      weatherLabel: null
      weatherFetchedAt: null
    }
  | { error: string } {
  const resolved = resolveChileLocationInput(input)
  if (resolved && 'error' in resolved) return resolved

  if (resolved === null) {
    return {
      regionCode: null,
      regionName: null,
      communeCode: null,
      communeName: null,
      communeLat: null,
      communeLon: null,
      ...clearMatchWeatherFields(),
    }
  }

  return {
    regionCode: resolved.regionCode,
    regionName: resolved.regionName,
    communeCode: resolved.communeCode,
    communeName: resolved.communeName,
    communeLat: resolved.communeLat,
    communeLon: resolved.communeLon,
    ...clearMatchWeatherFields(),
  }
}

export function locationChanged(
  existing: {
    regionCode: string | null
    communeCode: string | null
  },
  next: { regionCode?: string | null; communeCode?: string | null }
): boolean {
  const nextRegion = next.regionCode ?? existing.regionCode
  const nextCommune = next.communeCode ?? existing.communeCode
  return nextRegion !== existing.regionCode || nextCommune !== existing.communeCode
}

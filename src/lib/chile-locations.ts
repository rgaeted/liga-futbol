import comunasRaw from '@/data/chile-comunas.json'

export type ChileCommune = {
  code: string
  name: string
  regionCode: string
  lat: number
  lon: number
}

export type ChileRegion = {
  code: string
  name: string
}

const REGION_NAMES: Record<string, string> = {
  '01': 'Tarapacá',
  '02': 'Antofagasta',
  '03': 'Atacama',
  '04': 'Coquimbo',
  '05': 'Valparaíso',
  '06': "O'Higgins",
  '07': 'Maule',
  '08': 'Biobío',
  '09': 'La Araucanía',
  '10': 'Los Lagos',
  '11': 'Aysén',
  '12': 'Magallanes',
  '13': 'Metropolitana',
  '14': 'Los Ríos',
  '15': 'Arica y Parinacota',
  '16': 'Ñuble',
}

type RawCommune = {
  codigo: string
  nombre: string
  region_codigo: string
  lat: number
  lng: number
}

const COMMUNES: ChileCommune[] = (comunasRaw as RawCommune[]).map((row) => ({
  code: row.codigo,
  name: row.nombre,
  regionCode: row.region_codigo,
  lat: row.lat,
  lon: row.lng,
}))

const communeByCode = new Map(COMMUNES.map((c) => [c.code, c]))

export function listChileRegions(): ChileRegion[] {
  const codes = [...new Set(COMMUNES.map((c) => c.regionCode))].sort()
  return codes.map((code) => ({
    code,
    name: REGION_NAMES[code] ?? `Región ${code}`,
  }))
}

export function listChileCommunes(regionCode: string): ChileCommune[] {
  return COMMUNES.filter((c) => c.regionCode === regionCode).sort((a, b) =>
    a.name.localeCompare(b.name, 'es-CL')
  )
}

export function getChileCommune(code: string | null | undefined): ChileCommune | null {
  if (!code) return null
  return communeByCode.get(code) ?? null
}

export function formatChileLocation(
  regionName: string | null | undefined,
  communeName: string | null | undefined
): string | null {
  if (!communeName && !regionName) return null
  if (communeName && regionName) return `${communeName}, ${regionName}`
  return communeName ?? regionName ?? null
}

export function resolveChileLocationInput(input: {
  regionCode?: string | null
  communeCode?: string | null
}):
  | {
      regionCode: string
      regionName: string
      communeCode: string
      communeName: string
      communeLat: number
      communeLon: number
    }
  | null
  | { error: string } {
  const { regionCode, communeCode } = input
  if (!regionCode && !communeCode) return null

  if (!regionCode || !communeCode) {
    return { error: 'Debes seleccionar región y comuna' }
  }

  const commune = getChileCommune(communeCode)
  if (!commune) {
    return { error: 'Comuna inválida' }
  }
  if (commune.regionCode !== regionCode) {
    return { error: 'La comuna no pertenece a la región seleccionada' }
  }

  return {
    regionCode,
    regionName: REGION_NAMES[regionCode] ?? `Región ${regionCode}`,
    communeCode,
    communeName: commune.name,
    communeLat: commune.lat,
    communeLon: commune.lon,
  }
}

export function validateChileLocationPair(
  regionCode?: string | null,
  communeCode?: string | null
): string | null {
  if (!regionCode && !communeCode) return null
  const resolved = resolveChileLocationInput({ regionCode, communeCode })
  if (resolved && 'error' in resolved) return resolved.error
  return null
}

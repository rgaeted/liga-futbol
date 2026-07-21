import type { FootballFormat } from '@prisma/client'

export const FOOTBALL_FORMATS = ['FUTBOL_5', 'FUTBOL_6', 'FUTBOL_7', 'FUTBOL_11'] as const satisfies readonly FootballFormat[]

export const FOOTBALL_FORMAT_LABELS: Record<FootballFormat, string> = {
  FUTBOL_5: 'Fútbol 5',
  FUTBOL_6: 'Fútbol 6',
  FUTBOL_7: 'Fútbol 7',
  FUTBOL_11: 'Fútbol 11',
}

export function footballFormatLabel(format: FootballFormat): string {
  return FOOTBALL_FORMAT_LABELS[format]
}

/** Mínimo de convocados para citación / formación */
export function minCallUpSize(format: FootballFormat): number {
  switch (format) {
    case 'FUTBOL_5':
      return 5
    case 'FUTBOL_6':
      return 6
    case 'FUTBOL_7':
      return 7
    case 'FUTBOL_11':
      return 7
    default:
      return 7
  }
}

export function playersOnPitch(format: FootballFormat): number {
  switch (format) {
    case 'FUTBOL_5':
      return 5
    case 'FUTBOL_6':
      return 6
    case 'FUTBOL_7':
      return 7
    case 'FUTBOL_11':
      return 11
    default:
      return 11
  }
}

type MatchWithFormat = {
  footballFormat: FootballFormat
  season?: { footballFormat: FootballFormat } | null
}

/** Formato efectivo del partido (copiado al crear en liga; explícito en amistoso). */
export function resolveMatchFootballFormat(match: MatchWithFormat): FootballFormat {
  return match.footballFormat ?? match.season?.footballFormat ?? 'FUTBOL_11'
}

export function isFootballFormat(value: string): value is FootballFormat {
  return (FOOTBALL_FORMATS as readonly string[]).includes(value)
}

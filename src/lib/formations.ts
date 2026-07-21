import type { FootballFormat } from '@prisma/client'

export type FormationSlot = {
  key: string
  label: string
  /** 0 = goalkeeper row (bottom), higher = more attacking */
  row: number
  /** 0..1 horizontal position */
  col: number
}

const SCHEMES_F11 = {
  '4-4-2': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'LB', label: 'LI', row: 1, col: 0.12 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.35 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.65 },
    { key: 'RB', label: 'LD', row: 1, col: 0.88 },
    { key: 'LM', label: 'MI', row: 2, col: 0.12 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.35 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.65 },
    { key: 'RM', label: 'MD', row: 2, col: 0.88 },
    { key: 'ST_L', label: 'DC', row: 3, col: 0.35 },
    { key: 'ST_R', label: 'DC', row: 3, col: 0.65 },
  ],
  '4-3-3': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'LB', label: 'LI', row: 1, col: 0.12 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.35 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.65 },
    { key: 'RB', label: 'LD', row: 1, col: 0.88 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.25 },
    { key: 'CM', label: 'MCD', row: 2, col: 0.5 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.75 },
    { key: 'LW', label: 'EI', row: 3, col: 0.15 },
    { key: 'ST', label: 'DC', row: 3, col: 0.5 },
    { key: 'RW', label: 'ED', row: 3, col: 0.85 },
  ],
  '3-5-2': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.25 },
    { key: 'CB', label: 'DFC', row: 1, col: 0.5 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.75 },
    { key: 'LWB', label: 'CI', row: 2, col: 0.08 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.3 },
    { key: 'CM', label: 'MCD', row: 2, col: 0.5 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.7 },
    { key: 'RWB', label: 'CD', row: 2, col: 0.92 },
    { key: 'ST_L', label: 'DC', row: 3, col: 0.35 },
    { key: 'ST_R', label: 'DC', row: 3, col: 0.65 },
  ],
  '4-2-3-1': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'LB', label: 'LI', row: 1, col: 0.12 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.35 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.65 },
    { key: 'RB', label: 'LD', row: 1, col: 0.88 },
    { key: 'CDM_L', label: 'MCD', row: 2, col: 0.35 },
    { key: 'CDM_R', label: 'MCD', row: 2, col: 0.65 },
    { key: 'LAM', label: 'EI', row: 3, col: 0.15 },
    { key: 'CAM', label: 'MP', row: 3, col: 0.5 },
    { key: 'RAM', label: 'ED', row: 3, col: 0.85 },
    { key: 'ST', label: 'DC', row: 4, col: 0.5 },
  ],
  '5-3-2': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'LWB', label: 'CI', row: 1, col: 0.08 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.28 },
    { key: 'CB', label: 'DFC', row: 1, col: 0.5 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.72 },
    { key: 'RWB', label: 'CD', row: 1, col: 0.92 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.25 },
    { key: 'CM', label: 'MC', row: 2, col: 0.5 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.75 },
    { key: 'ST_L', label: 'DC', row: 3, col: 0.35 },
    { key: 'ST_R', label: 'DC', row: 3, col: 0.65 },
  ],
} as const satisfies Record<string, FormationSlot[]>

const SCHEMES_F7 = {
  '2-3-1': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.35 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.65 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.2 },
    { key: 'CM', label: 'MCD', row: 2, col: 0.5 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.8 },
    { key: 'ST', label: 'DC', row: 3, col: 0.5 },
  ],
  '3-2-1': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.25 },
    { key: 'CB', label: 'DFC', row: 1, col: 0.5 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.75 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.35 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.65 },
    { key: 'ST', label: 'DC', row: 3, col: 0.5 },
  ],
  '2-2-2': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.35 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.65 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.35 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.65 },
    { key: 'ST_L', label: 'DC', row: 3, col: 0.35 },
    { key: 'ST_R', label: 'DC', row: 3, col: 0.65 },
  ],
  '3-1-2': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.25 },
    { key: 'CB', label: 'DFC', row: 1, col: 0.5 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.75 },
    { key: 'CM', label: 'MC', row: 2, col: 0.5 },
    { key: 'ST_L', label: 'DC', row: 3, col: 0.35 },
    { key: 'ST_R', label: 'DC', row: 3, col: 0.65 },
  ],
  '1-3-2': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB', label: 'DFC', row: 1, col: 0.5 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.2 },
    { key: 'CM', label: 'MCD', row: 2, col: 0.5 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.8 },
    { key: 'ST_L', label: 'DC', row: 3, col: 0.35 },
    { key: 'ST_R', label: 'DC', row: 3, col: 0.65 },
  ],
} as const satisfies Record<string, FormationSlot[]>

const SCHEMES_F6 = {
  '2-2-1': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.35 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.65 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.35 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.65 },
    { key: 'ST', label: 'DC', row: 3, col: 0.5 },
  ],
  '1-3-1': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB', label: 'DFC', row: 1, col: 0.5 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.2 },
    { key: 'CM', label: 'MCD', row: 2, col: 0.5 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.8 },
    { key: 'ST', label: 'DC', row: 3, col: 0.5 },
  ],
  '2-1-2': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.35 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.65 },
    { key: 'CM', label: 'MC', row: 2, col: 0.5 },
    { key: 'ST_L', label: 'DC', row: 3, col: 0.35 },
    { key: 'ST_R', label: 'DC', row: 3, col: 0.65 },
  ],
  '3-1-1': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.25 },
    { key: 'CB', label: 'DFC', row: 1, col: 0.5 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.75 },
    { key: 'CM', label: 'MC', row: 2, col: 0.5 },
    { key: 'ST', label: 'DC', row: 3, col: 0.5 },
  ],
  '1-2-2': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB', label: 'DFC', row: 1, col: 0.5 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.35 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.65 },
    { key: 'ST_L', label: 'DC', row: 3, col: 0.35 },
    { key: 'ST_R', label: 'DC', row: 3, col: 0.65 },
  ],
} as const satisfies Record<string, FormationSlot[]>

const SCHEMES_F5 = {
  '1-2-1': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB', label: 'DFC', row: 1, col: 0.5 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.35 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.65 },
    { key: 'ST', label: 'DC', row: 3, col: 0.5 },
  ],
  '2-1-1': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.35 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.65 },
    { key: 'CM', label: 'MC', row: 2, col: 0.5 },
    { key: 'ST', label: 'DC', row: 3, col: 0.5 },
  ],
  '1-1-2': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB', label: 'DFC', row: 1, col: 0.5 },
    { key: 'CM', label: 'MC', row: 2, col: 0.5 },
    { key: 'ST_L', label: 'DC', row: 3, col: 0.35 },
    { key: 'ST_R', label: 'DC', row: 3, col: 0.65 },
  ],
  '2-2-0': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.35 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.65 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.35 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.65 },
  ],
} as const satisfies Record<string, FormationSlot[]>

const SCHEMES_BY_FORMAT: Record<FootballFormat, Record<string, FormationSlot[]>> = {
  FUTBOL_11: SCHEMES_F11,
  FUTBOL_7: SCHEMES_F7,
  FUTBOL_6: SCHEMES_F6,
  FUTBOL_5: SCHEMES_F5,
}

const DEFAULT_SCHEME: Record<FootballFormat, string> = {
  FUTBOL_11: '4-3-3',
  FUTBOL_7: '2-3-1',
  FUTBOL_6: '2-2-1',
  FUTBOL_5: '1-2-1',
}

/** Esquemas de fútbol 11 (retrocompatibilidad) */
export const FORMATION_SCHEMES = Object.keys(SCHEMES_F11) as (keyof typeof SCHEMES_F11)[]

export type FormationSchemeF11 = (typeof FORMATION_SCHEMES)[number]

export function getFormationSchemes(format: FootballFormat): string[] {
  return Object.keys(SCHEMES_BY_FORMAT[format])
}

export function getDefaultScheme(format: FootballFormat): string {
  return DEFAULT_SCHEME[format]
}

export function getFormationSlots(scheme: string, format: FootballFormat = 'FUTBOL_11'): FormationSlot[] {
  const catalog = SCHEMES_BY_FORMAT[format]
  if (!(scheme in catalog)) return []
  return catalog[scheme]
}

export function isValidScheme(scheme: string, format: FootballFormat = 'FUTBOL_11'): boolean {
  return scheme in SCHEMES_BY_FORMAT[format]
}

export function isValidSlotKey(
  scheme: string,
  slotKey: string,
  format: FootballFormat = 'FUTBOL_11'
): boolean {
  return getFormationSlots(scheme, format).some((s) => s.key === slotKey)
}

export function assertUniqueSlotAssignments(
  slots: Array<{ slotKey: string; playerId: string }>
): { ok: true } | { ok: false; duplicateSlotKeys: string[] } {
  const seen = new Map<string, string>()
  const duplicateSlotKeys: string[] = []
  for (const s of slots) {
    if (seen.has(s.slotKey)) duplicateSlotKeys.push(s.slotKey)
    else seen.set(s.slotKey, s.playerId)
  }
  if (duplicateSlotKeys.length > 0) return { ok: false, duplicateSlotKeys }
  return { ok: true }
}

/** Si el esquema guardado no aplica al formato, devuelve el default del formato. */
export function normalizeSchemeForFormat(scheme: string, format: FootballFormat): string {
  return isValidScheme(scheme, format) ? scheme : getDefaultScheme(format)
}

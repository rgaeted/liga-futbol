import { z } from 'zod'

/** Paleta fija para equipos — colores distinguibles en live oscuro */
export const TEAM_COLOR_PALETTE = [
  '#F5F5F5',
  '#1A1A1A',
  '#CD212A',
  '#2563EB',
  '#16A34A',
  '#EAB308',
  '#9333EA',
  '#EA580C',
  '#0891B2',
  '#BE123C',
  '#4F46E5',
  '#65A30D',
] as const

export type TeamColor = (typeof TEAM_COLOR_PALETTE)[number]

export const teamColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido')

export function deriveTeamColor(seed: string): TeamColor {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return TEAM_COLOR_PALETTE[hash % TEAM_COLOR_PALETTE.length]
}

export function resolveTeamColor(stored: string | null | undefined, seed: string): string {
  if (stored && teamColorSchema.safeParse(stored).success) return stored
  return deriveTeamColor(seed)
}

export function contrastTextColor(hex: string): '#ffffff' | '#111827' {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#111827' : '#ffffff'
}

export function resolveMatchSideColor(
  stored: string | null | undefined,
  sideName: string
): string {
  return resolveTeamColor(stored, sideName)
}

export function resolveEventTeamColor(
  teamName: string | null | undefined,
  sides: {
    homeName: string
    awayName: string
    homeColor: string
    awayColor: string
  }
): string | null {
  if (!teamName) return null
  if (teamName === sides.homeName) return sides.homeColor
  if (teamName === sides.awayName) return sides.awayColor
  return null
}

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

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!teamColorSchema.safeParse(hex).success) return null
  const value = hex.trim().slice(1)
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

function relativeLuminance(hex: string): number | null {
  const rgb = parseHexRgb(hex)
  if (!rgb) return null
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
}

function toHexByte(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()
}

export function contrastTextColor(hex: string): '#ffffff' | '#111827' {
  const luminance = relativeLuminance(hex) ?? 0
  return luminance > 0.62 ? '#111827' : '#ffffff'
}

/** Colores muy oscuros (Negros) no se leen como borde sobre el live noche. */
const DARK_ACCENT_LUMINANCE = 0.22
const DARK_ACCENT_WHITE_MIX = 0.55

export function visibleTeamAccentColor(hex: string): string {
  const rgb = parseHexRgb(hex)
  const luminance = relativeLuminance(hex)
  if (!rgb || luminance == null || luminance >= DARK_ACCENT_LUMINANCE) return hex
  const mix = DARK_ACCENT_WHITE_MIX
  return `#${toHexByte(rgb.r + (255 - rgb.r) * mix)}${toHexByte(rgb.g + (255 - rgb.g) * mix)}${toHexByte(rgb.b + (255 - rgb.b) * mix)}`
}

export function hexToRgba(hex: string, alpha: number): string | null {
  const rgb = parseHexRgb(hex)
  if (!rgb) return null
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
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

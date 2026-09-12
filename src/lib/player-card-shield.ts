import { APP_LOCALE } from '@/lib/locale'
import type { PlayerCardAtributos } from '@/lib/player-card'

/** Display en carta web (`--font-oswald`) y OG (Satori). */
export const PLAYER_CARD_DISPLAY_FONT_OG = 'Oswald'
export const PLAYER_CARD_DISPLAY_FONT_OG_URL =
  'https://fonts.gstatic.com/s/oswald/v57/TK3_WkUHHAIjg75cFRf3bXL8LICs1xZosUZiZQ.woff2'

/** Paleta Los Lunes sobre silueta escudo FIFA (futbol-stats). */
export const PLAYER_CARD_PALETTE = {
  bg1: '#1a3828',
  bg2: '#0c1611',
  bg3: '#14241d',
  lines: '#3de68c',
  text: '#edf2ee',
  num: '#e8c878',
  glow: '#3de68c',
  muted: '#8ba598',
} as const

export const PLAYER_CARD_STAT_PAIRS: Array<
  [keyof PlayerCardAtributos, keyof PlayerCardAtributos]
> = [
  ['TIR', 'VIS'],
  ['RES', 'REG'],
  ['RIT', 'FIS'],
]

export const PLAYER_CARD_STAT_LABELS: Record<string, string> = {
  TIR: 'TIR',
  VIS: 'VIS',
  RES: 'RES',
  REG: 'REG',
  RIT: 'RIT',
  FIS: 'FÍS',
}

export const PLAYER_CARD_BASE_WIDTH = 270

export function playerCardShieldPath(w: number, h: number): string {
  return `M ${w * 0.5} ${h * 0.02}
    C ${w * 0.42} ${h * 0.06}, ${w * 0.3} ${h * 0.07}, ${w * 0.14} ${h * 0.05}
    C ${w * 0.06} ${h * 0.045}, ${w * 0.02} ${h * 0.06}, ${w * 0.02} ${h * 0.12}
    L ${w * 0.02} ${h * 0.74}
    C ${w * 0.02} ${h * 0.82}, ${w * 0.06} ${h * 0.86}, ${w * 0.16} ${h * 0.9}
    C ${w * 0.3} ${h * 0.95}, ${w * 0.42} ${h * 0.985}, ${w * 0.5} ${h * 0.998}
    C ${w * 0.58} ${h * 0.985}, ${w * 0.7} ${h * 0.95}, ${w * 0.84} ${h * 0.9}
    C ${w * 0.94} ${h * 0.86}, ${w * 0.98} ${h * 0.82}, ${w * 0.98} ${h * 0.74}
    L ${w * 0.98} ${h * 0.12}
    C ${w * 0.98} ${h * 0.06}, ${w * 0.94} ${h * 0.045}, ${w * 0.86} ${h * 0.05}
    C ${w * 0.7} ${h * 0.07}, ${w * 0.58} ${h * 0.06}, ${w * 0.5} ${h * 0.02} Z`
}

export function playerCardShieldHeight(w: number): number {
  return Math.round(400 * (w / PLAYER_CARD_BASE_WIDTH))
}

export function formatPlayerCardStat(value: number | null): string {
  return value === null ? '–' : String(value)
}

export function playerCardGolPorPartido(goles: number, pj: number): string {
  if (pj === 0) return '–'
  return (goles / pj).toLocaleString(APP_LOCALE, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

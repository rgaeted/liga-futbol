export const FRIENDLY_PLAYER_POSITIONS = [
  'Arquero',
  'Defensa central',
  'Lateral derecho',
  'Lateral izquierdo',
  'Mediocampista defensivo',
  'Mediocampista',
  'Mediocampista ofensivo',
  'Extremo derecho',
  'Extremo izquierdo',
  'Delantero',
] as const

export type FriendlyPlayerPosition = (typeof FRIENDLY_PLAYER_POSITIONS)[number]

export const DOMINANT_FOOT_VALUES = ['RIGHT', 'LEFT', 'BOTH'] as const
export type DominantFootValue = (typeof DOMINANT_FOOT_VALUES)[number]

export const DOMINANT_FOOT_LABELS: Record<DominantFootValue, string> = {
  RIGHT: 'Derecho',
  LEFT: 'Izquierdo',
  BOTH: 'Ambidiestro',
}

export function formatDominantFoot(value: DominantFootValue | null | undefined): string {
  if (!value) return '—'
  return DOMINANT_FOOT_LABELS[value]
}

export function formatFriendlyPlayerLabel(player: {
  firstName: string
  lastName: string
  primaryPosition?: string | null
}): string {
  const name = `${player.firstName} ${player.lastName}`.trim()
  return player.primaryPosition ? `${name} (${player.primaryPosition})` : name
}

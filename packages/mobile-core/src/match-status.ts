export const MATCH_STATUSES = [
  'SCHEDULED',
  'LIVE',
  'HALFTIME',
  'FINISHED',
  'CANCELLED',
] as const

export type MatchStatusCode = (typeof MATCH_STATUSES)[number]

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programado',
  LIVE: 'En juego',
  HALFTIME: 'Entretiempo',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
}

export function formatMatchStatus(status: string): string {
  return STATUS_LABELS[status] ?? status
}

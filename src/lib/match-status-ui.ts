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

export function matchStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function matchStatusBadgeClass(status: string): string {
  switch (status) {
    case 'LIVE':
      return 'bg-red-100 text-red-700'
    case 'HALFTIME':
      return 'bg-amber-100 text-amber-800'
    case 'FINISHED':
      return 'bg-emerald-100 text-emerald-800'
    case 'CANCELLED':
      return 'bg-kelme-gray-200 text-kelme-gray-600'
    default:
      return 'bg-kelme-gray-100 text-kelme-gray-700'
  }
}

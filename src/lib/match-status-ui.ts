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
      return 'bg-[#0B1210] text-org-primary ring-1 ring-[color:var(--org-primary)]/35'
    case 'HALFTIME':
      return 'bg-[#0B1210] text-amber-300 ring-1 ring-amber-400/35'
    case 'FINISHED':
      return 'bg-[#0B1210] text-[#3D8B6E] ring-1 ring-[#3D8B6E]/35'
    case 'CANCELLED':
      return 'bg-[#0B1210] text-[#8A938C] ring-1 ring-[#2A3A32]'
    default:
      return 'bg-[#0B1210] text-[#8A938C] ring-1 ring-[#2A3A32]'
  }
}

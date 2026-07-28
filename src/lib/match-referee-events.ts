import { EventType } from '@prisma/client'
import { EVENT_TYPE_LABELS } from '@/lib/event-labels'

/** Siempre disponibles para el árbitro (inicio, entretiempo, final). */
export const REFEREE_CONTROL_EVENT_TYPES = [
  EventType.KICKOFF,
  EventType.HALFTIME,
  EventType.FULLTIME,
] as const

/** Eventos que el admin puede activar o desactivar por partido. */
export const REFEREE_MEASURABLE_EVENT_TYPES = [
  EventType.GOAL,
  EventType.OWN_GOAL,
  EventType.YELLOW_CARD,
  EventType.RED_CARD,
  EventType.SHOT_ON_TARGET,
  EventType.SHOT_OFF_TARGET,
  EventType.SUBSTITUTION,
  EventType.FOUL,
] as const

export const DEFAULT_REFEREE_EVENT_TYPES: EventType[] = [
  ...REFEREE_CONTROL_EVENT_TYPES,
  EventType.GOAL,
  EventType.YELLOW_CARD,
  EventType.RED_CARD,
  EventType.SHOT_ON_TARGET,
  EventType.SHOT_OFF_TARGET,
  EventType.SUBSTITUTION,
  EventType.FOUL,
]

export type RefereePanelEventConfig = {
  type: EventType
  label: string
  color: string
}

export const REFEREE_PANEL_EVENT_CONFIG: RefereePanelEventConfig[] = [
  { type: EventType.KICKOFF, label: '▶ Inicio', color: 'bg-kelme-red' },
  { type: EventType.GOAL, label: '⚽ Gol', color: 'bg-green-600' },
  { type: EventType.OWN_GOAL, label: '⚽ Autogol', color: 'bg-orange-700' },
  { type: EventType.YELLOW_CARD, label: '🟨 Amarilla', color: 'bg-yellow-500 text-black' },
  { type: EventType.RED_CARD, label: '🟥 Roja', color: 'bg-red-600' },
  { type: EventType.SHOT_ON_TARGET, label: '🎯 Tiro al arco', color: 'bg-blue-600' },
  { type: EventType.SHOT_OFF_TARGET, label: '↗ Tiro fuera', color: 'bg-kelme-gray-600' },
  { type: EventType.SUBSTITUTION, label: '🔄 Cambio', color: 'bg-purple-600' },
  { type: EventType.FOUL, label: '⚠ Falta', color: 'bg-orange-600' },
  { type: EventType.HALFTIME, label: '⏸ Entretiempo', color: 'bg-kelme-gray-600' },
  { type: EventType.FULLTIME, label: '⏹ Final', color: 'bg-kelme-gray-900' },
]

const PANEL_ORDER = new Map(
  REFEREE_PANEL_EVENT_CONFIG.map((item, index) => [item.type, index])
)

export function resolveRefereeEventTypes(
  stored: EventType[] | null | undefined
): EventType[] {
  if (!stored || stored.length === 0) return [...DEFAULT_REFEREE_EVENT_TYPES]
  return normalizeRefereeEventTypes(stored)
}

export function normalizeRefereeEventTypes(types: EventType[]): EventType[] {
  const set = new Set<EventType>(REFEREE_CONTROL_EVENT_TYPES)
  for (const type of types) {
    if (isConfigurableRefereeEvent(type)) set.add(type)
  }
  return sortRefereeEventTypes([...set])
}

export function isConfigurableRefereeEvent(type: EventType): boolean {
  return (REFEREE_MEASURABLE_EVENT_TYPES as readonly EventType[]).includes(type)
}

export function sortRefereeEventTypes(types: EventType[]): EventType[] {
  return [...types].sort(
    (a, b) => (PANEL_ORDER.get(a) ?? 999) - (PANEL_ORDER.get(b) ?? 999)
  )
}

export function validateRefereeEventTypes(types: EventType[]): string | null {
  const normalized = normalizeRefereeEventTypes(types)
  const measurable = normalized.filter(isConfigurableRefereeEvent)
  if (measurable.length === 0) {
    return 'Selecciona al menos un evento para que el árbitro registre'
  }
  return null
}

export function refereePanelEvents(
  enabledTypes: EventType[] | null | undefined
): RefereePanelEventConfig[] {
  const enabled = new Set(resolveRefereeEventTypes(enabledTypes))
  return REFEREE_PANEL_EVENT_CONFIG.filter((item) => enabled.has(item.type))
}

export function refereeEventTypeLabel(type: EventType): string {
  return EVENT_TYPE_LABELS[type]
}

export function isRefereeEventEnabled(
  matchTypes: EventType[] | null | undefined,
  type: EventType
): boolean {
  return resolveRefereeEventTypes(matchTypes).includes(type)
}

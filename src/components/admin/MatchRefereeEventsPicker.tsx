'use client'

import { EventType } from '@prisma/client'
import {
  DEFAULT_REFEREE_EVENT_TYPES,
  REFEREE_CONTROL_EVENT_TYPES,
  REFEREE_MEASURABLE_EVENT_TYPES,
  normalizeRefereeEventTypes,
  refereeEventTypeLabel,
} from '@/lib/match-referee-events'

type Props = {
  value: EventType[]
  onChange: (next: EventType[]) => void
  disabled?: boolean
}

export function MatchRefereeEventsPicker({ value, onChange, disabled = false }: Props) {
  const normalized = normalizeRefereeEventTypes(value)
  const enabledMeasurable = new Set(
    normalized.filter((type) =>
      (REFEREE_MEASURABLE_EVENT_TYPES as readonly EventType[]).includes(type)
    )
  )

  function toggleMeasurable(type: EventType, checked: boolean) {
    const next = new Set(enabledMeasurable)
    if (checked) next.add(type)
    else next.delete(type)
    onChange(normalizeRefereeEventTypes([...REFEREE_CONTROL_EVENT_TYPES, ...next]))
  }

  function selectAllMeasurable() {
    onChange(normalizeRefereeEventTypes([...DEFAULT_REFEREE_EVENT_TYPES]))
  }

  function clearMeasurable() {
    onChange(normalizeRefereeEventTypes([...REFEREE_CONTROL_EVENT_TYPES, EventType.GOAL]))
  }

  return (
    <fieldset
      disabled={disabled}
      className="rounded-xl border border-kelme-border bg-kelme-gray-50/80 p-4 md:col-span-3"
    >
      <legend className="px-1 font-ui text-sm font-semibold text-kelme-gray-900">
        Eventos del árbitro
      </legend>
      <p className="mt-1 text-xs text-kelme-gray-500">
        Elige qué debe registrar el árbitro en este partido. Inicio, entretiempo y final siempre
        estarán disponibles.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {REFEREE_CONTROL_EVENT_TYPES.map((type) => (
          <span
            key={type}
            className="inline-flex items-center gap-1.5 rounded-full border border-kelme-border bg-kelme-surface px-2.5 py-1 text-xs text-kelme-gray-600"
          >
            <span className="font-semibold text-kelme-gray-400">●</span>
            {refereeEventTypeLabel(type)}
            <span className="text-[10px] uppercase tracking-wide text-kelme-gray-400">
              siempre
            </span>
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAllMeasurable}
          className="rounded-lg border border-kelme-border bg-kelme-surface px-2.5 py-1 text-xs hover:border-kelme-red/40"
        >
          Marcar todos
        </button>
        <button
          type="button"
          onClick={clearMeasurable}
          className="rounded-lg border border-kelme-border bg-kelme-surface px-2.5 py-1 text-xs hover:border-kelme-red/40"
        >
          Solo goles
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {REFEREE_MEASURABLE_EVENT_TYPES.map((type) => {
          const checked = enabledMeasurable.has(type)
          return (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                checked
                  ? 'border-kelme-red/40 bg-kelme-red/5 text-kelme-gray-900'
                  : 'border-kelme-border bg-kelme-surface text-kelme-gray-600'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => toggleMeasurable(type, e.target.checked)}
                className="rounded border-kelme-border text-kelme-red focus:ring-kelme-red"
              />
              <span>{refereeEventTypeLabel(type)}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

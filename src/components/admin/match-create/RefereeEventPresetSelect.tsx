'use client'

import type { EventType } from '@prisma/client'
import {
  REFEREE_EVENT_PRESET_LABELS,
  type RefereeEventPreset,
  detectRefereeEventPreset,
  refereeEventTypesForPreset,
} from '@/lib/match-referee-event-presets'
import { isConfigurableRefereeEvent, refereeEventTypeLabel } from '@/lib/match-referee-events'

type Props = {
  preset: RefereeEventPreset
  onPresetChange: (preset: RefereeEventPreset) => void
  eventTypes: EventType[]
  onEventTypesChange: (types: EventType[]) => void
  disabled?: boolean
}

export function RefereeEventPresetSelect({
  preset,
  onPresetChange,
  eventTypes,
  onEventTypesChange,
  disabled = false,
}: Props) {
  function handlePresetChange(next: RefereeEventPreset) {
    onPresetChange(next)
    if (next !== 'personalizado') {
      onEventTypesChange(refereeEventTypesForPreset(next))
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-kelme-gray-700">
        Registro de eventos del árbitro
        <select
          value={preset}
          disabled={disabled}
          onChange={(e) => handlePresetChange(e.target.value as RefereeEventPreset)}
          className="mt-1 w-full input-kelme rounded-lg px-3 py-2"
        >
          {(Object.keys(REFEREE_EVENT_PRESET_LABELS) as RefereeEventPreset[]).map((key) => (
            <option key={key} value={key}>
              {REFEREE_EVENT_PRESET_LABELS[key]}
              {key === 'basico' ? ' (goles y tarjetas)' : ''}
              {key === 'completo' ? ' (todos los eventos)' : ''}
            </option>
          ))}
        </select>
      </label>
      {preset === 'personalizado' ? (
        <p className="text-xs text-kelme-gray-500">
          Personaliza los eventos en el paso &quot;Eventos del árbitro&quot;.
        </p>
      ) : (
        <p className="text-xs text-kelme-gray-500">
          Incluye:{' '}
          {eventTypes
            .filter(isConfigurableRefereeEvent)
            .map((type) => refereeEventTypeLabel(type))
            .join(', ')}
        </p>
      )}
    </div>
  )
}

export function syncPresetFromEventTypes(
  next: EventType[],
  onEventTypesChange: (types: EventType[]) => void,
  onPresetChange: (preset: RefereeEventPreset) => void
) {
  onEventTypesChange(next)
  onPresetChange(detectRefereeEventPreset(next))
}

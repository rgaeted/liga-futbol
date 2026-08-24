'use client'

import type { EventType } from '@prisma/client'
import { isConfigurableRefereeEvent, refereeEventTypeLabel } from '@/lib/match-referee-events'
import { REFEREE_EVENT_PRESET_LABELS, type RefereeEventPreset } from '@/lib/match-referee-event-presets'

type SummaryRow = { label: string; value: string }

type BaseProps = {
  rows: SummaryRow[]
  regionLabel: string
  communeLabel: string
  eventTypes: EventType[]
  eventPreset?: RefereeEventPreset
  footerMessage?: string
}

type FriendlyRosterSummary = {
  convokedCount: number
  sideACount: number
  sideBCount: number
  rosterReady: boolean
}

type Props = BaseProps & {
  friendlyRoster?: FriendlyRosterSummary
}

function dash(value: string | undefined | null): string {
  return value?.trim() ? value : '—'
}

export function MatchCreateSummary({
  rows,
  regionLabel,
  communeLabel,
  eventTypes,
  eventPreset,
  footerMessage,
  friendlyRoster,
}: Props) {
  const measurable = eventTypes.filter(isConfigurableRefereeEvent)

  return (
    <div className="space-y-4 rounded-2xl border border-kelme-border bg-kelme-gray-50 p-5">
      <div>
        <h2 className="font-ui text-xs font-semibold uppercase tracking-wider text-kelme-gray-400">
          Resumen del partido
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt className="text-kelme-gray-500">{row.label}</dt>
              <dd className="text-right font-medium text-kelme-gray-900">{dash(row.value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-t border-kelme-border pt-4">
        <h3 className="font-ui text-xs font-semibold uppercase tracking-wider text-kelme-gray-400">
          Ubicación
        </h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-kelme-gray-500">Región</dt>
            <dd className="text-right font-medium text-kelme-gray-900">{dash(regionLabel)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-kelme-gray-500">Comuna</dt>
            <dd className="text-right font-medium text-kelme-gray-900">{dash(communeLabel)}</dd>
          </div>
        </dl>
      </div>

      {friendlyRoster ? (
        <div className="border-t border-kelme-border pt-4">
          <h3 className="font-ui text-xs font-semibold uppercase tracking-wider text-kelme-gray-400">
            Plantel
          </h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-kelme-gray-500">Convocados</dt>
              <dd className="font-medium text-kelme-gray-900">{friendlyRoster.convokedCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-kelme-gray-500">Lado A / B</dt>
              <dd className="font-medium text-kelme-gray-900">
                {friendlyRoster.sideACount} / {friendlyRoster.sideBCount}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-kelme-gray-500">Capitán y DT</dt>
              <dd className="font-medium text-kelme-gray-900">
                {friendlyRoster.rosterReady ? 'Listo' : 'Pendiente'}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="border-t border-kelme-border pt-4">
        <h3 className="font-ui text-xs font-semibold uppercase tracking-wider text-kelme-gray-400">
          Eventos seleccionados
        </h3>
        {eventPreset && eventPreset !== 'personalizado' ? (
          <p className="mt-2 text-sm font-medium text-kelme-gray-900">
            {REFEREE_EVENT_PRESET_LABELS[eventPreset]}
          </p>
        ) : null}
        {measurable.length === 0 ? (
          <p className="mt-2 text-sm text-kelme-gray-500">Aún no seleccionas eventos</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {measurable.map((type) => (
              <li
                key={type}
                className="rounded-full bg-kelme-surface px-2 py-0.5 text-xs text-kelme-gray-700 ring-1 ring-kelme-border"
              >
                {refereeEventTypeLabel(type)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {footerMessage ? (
        <p className="border-t border-kelme-border pt-4 text-xs text-kelme-gray-500">
          {footerMessage}
        </p>
      ) : null}
    </div>
  )
}

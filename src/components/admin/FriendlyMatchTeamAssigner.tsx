'use client'

import type { FriendlySide } from '@/lib/friendly-match-roster-ui'
import { orderRosterByAttendance } from '@/lib/match-attendance'
import { FriendlyPlayerAvatar } from './FriendlyPlayerAvatar'
import type { FriendlyRosterPlayer } from './FriendlyMatchConvocationPicker'

function playerLabel(p: FriendlyRosterPlayer) {
  const name = `${p.firstName} ${p.lastName}`.trim()
  return p.primaryPosition ? `${name} (${p.primaryPosition})` : name
}

function SideToggle({
  side,
  current,
  onChange,
  label,
}: {
  side: FriendlySide | null
  current: FriendlySide | null
  onChange: (side: FriendlySide | null) => void
  label: string
}) {
  const active = current === side
  return (
    <button
      type="button"
      onClick={() => onChange(side)}
      className={`min-w-[2.5rem] rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
        active
          ? 'bg-kelme-red text-white'
          : 'border border-kelme-border bg-kelme-gray-100 text-kelme-gray-700 hover:bg-kelme-surface'
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}

type Props = {
  convoked: FriendlyRosterPlayer[]
  sideAName?: string
  sideBName?: string
  sideAIds: Set<string>
  sideBIds: Set<string>
  sideACaptainId: string | null
  sideBCaptainId: string | null
  sideACoachId: string | null
  sideBCoachId: string | null
  onSideChange: (playerId: string, side: FriendlySide | null) => void
  onSideACaptainChange: (playerId: string | null) => void
  onSideBCaptainChange: (playerId: string | null) => void
  onSideACoachChange: (playerId: string | null) => void
  onSideBCoachChange: (playerId: string | null) => void
  attendingPlayerIds?: string[]
  /** Si true, lados y roles son opcionales (amistoso intra). */
  sidesOptional?: boolean
}

export function FriendlyMatchTeamAssigner({
  convoked,
  sideAName = 'A',
  sideBName = 'B',
  sideAIds,
  sideBIds,
  sideACaptainId,
  sideBCaptainId,
  sideACoachId,
  sideBCoachId,
  onSideChange,
  onSideACaptainChange,
  onSideBCaptainChange,
  onSideACoachChange,
  onSideBCoachChange,
  attendingPlayerIds,
  sidesOptional = false,
}: Props) {
  const attending = attendingPlayerIds ?? []
  const attendingSet = new Set(attending)
  const sortedConvoked = orderRosterByAttendance(convoked, attending)

  function currentSide(playerId: string): FriendlySide | null {
    if (sideBIds.has(playerId)) return 'B'
    if (sideAIds.has(playerId)) return 'A'
    return null
  }

  return (
    <div className="space-y-4">
      <fieldset className="rounded-lg border border-kelme-border bg-kelme-surface p-3">
        <legend className="px-1 text-sm font-medium">
          {sidesOptional ? 'Equipos (opcional)' : 'Equipos'}
        </legend>
        {sidesOptional ? (
          <p className="mb-2 text-xs text-kelme-gray-500">
            Puedes dejar jugadores sin lado. En vivo se listan como disponibles del partido.
          </p>
        ) : null}
        {sortedConvoked.length === 0 ? (
          <p className="text-sm text-kelme-gray-400">No hay jugadores convocados.</p>
        ) : (
          <ul className="divide-y divide-kelme-border">
            {sortedConvoked.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <FriendlyPlayerAvatar
                    id={p.id}
                    firstName={p.firstName}
                    lastName={p.lastName}
                    hasPhoto={Boolean(p.hasPhoto)}
                    size="sm"
                  />
                  <span className="truncate">{playerLabel(p)}</span>
                  {attendingSet.has(p.id) ? (
                    <span className="rounded-full bg-[#0B1210] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3D8B6E] ring-1 ring-[#3D8B6E]/35">
                      Va
                    </span>
                  ) : null}
                  {sidesOptional && currentSide(p.id) == null ? (
                    <span className="rounded-full bg-kelme-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kelme-gray-500">
                      Sin lado
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-1" role="group" aria-label={`Equipo de ${playerLabel(p)}`}>
                  {sidesOptional ? (
                    <SideToggle
                      side={null}
                      current={currentSide(p.id)}
                      onChange={() => onSideChange(p.id, null)}
                      label="—"
                    />
                  ) : null}
                  <SideToggle
                    side="A"
                    current={currentSide(p.id)}
                    onChange={() => onSideChange(p.id, 'A')}
                    label="A"
                  />
                  <SideToggle
                    side="B"
                    current={currentSide(p.id)}
                    onChange={() => onSideChange(p.id, 'B')}
                    label="B"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <fieldset className="rounded-lg border border-kelme-border bg-kelme-surface p-3">
          <legend className="px-1 text-sm font-medium">Lado {sideAName}</legend>
          <label className="mt-1 block text-sm">
            <span className="mb-1 block font-medium text-kelme-gray-700">
              Capitán{sidesOptional ? ' (si hay jugadores en el lado)' : ''}
            </span>
            <select
              value={sideACaptainId ?? ''}
              onChange={(e) => onSideACaptainChange(e.target.value || null)}
              disabled={sideAIds.size === 0}
              className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <option value="">Seleccionar capitán…</option>
              {[...sideAIds].map((playerId) => {
                const row = convoked.find((r) => r.id === playerId)
                if (!row) return null
                return (
                  <option key={playerId} value={playerId}>
                    {playerLabel(row)}
                  </option>
                )
              })}
            </select>
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium text-kelme-gray-700">
              DT (director técnico){sidesOptional ? ' (si hay jugadores en el lado)' : ''}
            </span>
            <select
              value={sideACoachId ?? ''}
              onChange={(e) => onSideACoachChange(e.target.value || null)}
              disabled={sideAIds.size === 0}
              className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <option value="">Seleccionar DT…</option>
              {[...sideAIds].map((playerId) => {
                const row = convoked.find((r) => r.id === playerId)
                if (!row) return null
                return (
                  <option key={playerId} value={playerId}>
                    {playerLabel(row)}
                  </option>
                )
              })}
            </select>
          </label>
        </fieldset>

        <fieldset className="rounded-lg border border-kelme-border bg-kelme-surface p-3">
          <legend className="px-1 text-sm font-medium">Lado {sideBName}</legend>
          <label className="mt-1 block text-sm">
            <span className="mb-1 block font-medium text-kelme-gray-700">
              Capitán{sidesOptional ? ' (si hay jugadores en el lado)' : ''}
            </span>
            <select
              value={sideBCaptainId ?? ''}
              onChange={(e) => onSideBCaptainChange(e.target.value || null)}
              disabled={sideBIds.size === 0}
              className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <option value="">Seleccionar capitán…</option>
              {[...sideBIds].map((playerId) => {
                const row = convoked.find((r) => r.id === playerId)
                if (!row) return null
                return (
                  <option key={playerId} value={playerId}>
                    {playerLabel(row)}
                  </option>
                )
              })}
            </select>
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium text-kelme-gray-700">
              DT (director técnico){sidesOptional ? ' (si hay jugadores en el lado)' : ''}
            </span>
            <select
              value={sideBCoachId ?? ''}
              onChange={(e) => onSideBCoachChange(e.target.value || null)}
              disabled={sideBIds.size === 0}
              className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <option value="">Seleccionar DT…</option>
              {[...sideBIds].map((playerId) => {
                const row = convoked.find((r) => r.id === playerId)
                if (!row) return null
                return (
                  <option key={playerId} value={playerId}>
                    {playerLabel(row)}
                  </option>
                )
              })}
            </select>
          </label>
        </fieldset>
      </div>
    </div>
  )
}

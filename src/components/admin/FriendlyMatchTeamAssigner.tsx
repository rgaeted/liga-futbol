'use client'

import type { FriendlySide } from '@/lib/friendly-match-roster-ui'
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
}: {
  side: FriendlySide
  current: FriendlySide
  onChange: (side: FriendlySide) => void
}) {
  const active = current === side
  return (
    <button
      type="button"
      onClick={() => onChange(side)}
      className={`min-w-[2.5rem] rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
        active
          ? 'bg-kelme-red text-white'
          : 'border border-kelme-border bg-kelme-gray-100 text-kelme-gray-700 hover:bg-white'
      }`}
      aria-pressed={active}
    >
      {side}
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
  onSideChange: (playerId: string, side: FriendlySide) => void
  onSideACaptainChange: (playerId: string | null) => void
  onSideBCaptainChange: (playerId: string | null) => void
  onSideACoachChange: (playerId: string | null) => void
  onSideBCoachChange: (playerId: string | null) => void
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
}: Props) {
  const sortedConvoked = [...convoked].sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'es')
  )

  function currentSide(playerId: string): FriendlySide | null {
    if (sideBIds.has(playerId)) return 'B'
    if (sideAIds.has(playerId)) return 'A'
    return null
  }

  return (
    <div className="space-y-4">
      <fieldset className="rounded-lg border border-kelme-border bg-white p-3">
        <legend className="px-1 text-sm font-medium">Equipos</legend>
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
                </div>
                <div className="flex gap-1" role="group" aria-label={`Equipo de ${playerLabel(p)}`}>
                  <SideToggle
                    side="A"
                    current={currentSide(p.id) ?? 'A'}
                    onChange={() => onSideChange(p.id, 'A')}
                  />
                  <SideToggle
                    side="B"
                    current={currentSide(p.id) ?? 'B'}
                    onChange={() => onSideChange(p.id, 'B')}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <fieldset className="rounded-lg border border-kelme-border bg-white p-3">
          <legend className="px-1 text-sm font-medium">Lado {sideAName}</legend>
          <label className="mt-1 block text-sm">
            <span className="mb-1 block font-medium text-kelme-gray-700">Capitán</span>
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
            <span className="mb-1 block font-medium text-kelme-gray-700">DT (director técnico)</span>
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

        <fieldset className="rounded-lg border border-kelme-border bg-white p-3">
          <legend className="px-1 text-sm font-medium">Lado {sideBName}</legend>
          <label className="mt-1 block text-sm">
            <span className="mb-1 block font-medium text-kelme-gray-700">Capitán</span>
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
            <span className="mb-1 block font-medium text-kelme-gray-700">DT (director técnico)</span>
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

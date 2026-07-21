'use client'

import { useMemo, useState } from 'react'
import type { FootballFormat } from '@prisma/client'
import {
  getDefaultScheme,
  getFormationSchemes,
  getFormationSlots,
  normalizeSchemeForFormat,
} from '@/lib/formations'
import { buildLineupView } from '@/lib/match-lineup'
import { footballFormatLabel } from '@/lib/football-format'
import { FormationPitch } from './FormationPitch'

export type EditorPlayer = { id: string; label: string }

type Props = {
  footballFormat: FootballFormat
  initialScheme?: string
  initialSlots?: Record<string, string>
  players: EditorPlayer[]
  onSave: (payload: {
    scheme: string
    slots: Array<{ slotKey: string; playerId: string }>
    benchPlayerIds: string[]
  }) => Promise<void>
  saveLabel?: string
}

export function FormationEditor({
  footballFormat,
  initialScheme,
  initialSlots = {},
  players,
  onSave,
  saveLabel = 'Guardar formación',
}: Props) {
  const schemes = useMemo(() => getFormationSchemes(footballFormat), [footballFormat])
  const defaultScheme = useMemo(() => getDefaultScheme(footballFormat), [footballFormat])
  const resolvedInitialScheme = normalizeSchemeForFormat(initialScheme ?? defaultScheme, footballFormat)

  const [scheme, setScheme] = useState(resolvedInitialScheme)
  const [slots, setSlots] = useState<Record<string, string>>(initialSlots)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const assignedIds = useMemo(() => new Set(Object.values(slots)), [slots])

  const lineup = buildLineupView({
    scheme,
    footballFormat,
    assignments: Object.entries(slots).map(([slotKey, playerId]) => ({
      slotKey,
      playerId,
      playerName: players.find((p) => p.id === playerId)?.label ?? playerId,
    })),
    bench: players
      .filter((p) => !assignedIds.has(p.id))
      .map((p) => ({ playerId: p.id, playerName: p.label })),
  })

  function onSchemeChange(next: string) {
    setScheme(next)
    const valid = new Set(getFormationSlots(next, footballFormat).map((s) => s.key))
    setSlots((prev) => {
      const nextSlots: Record<string, string> = {}
      for (const [k, v] of Object.entries(prev)) {
        if (valid.has(k)) nextSlots[k] = v
      }
      return nextSlots
    })
    setSelectedSlot(null)
  }

  function assignPlayerToSelected(playerId: string) {
    if (!selectedSlot) return
    setSlots((prev) => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(next)) {
        if (v === playerId) delete next[k]
      }
      next[selectedSlot] = playerId
      return next
    })
  }

  function clearSelectedSlot() {
    if (!selectedSlot) return
    setSlots((prev) => {
      const next = { ...prev }
      delete next[selectedSlot]
      return next
    })
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      await onSave({
        scheme,
        slots: Object.entries(slots).map(([slotKey, playerId]) => ({
          slotKey,
          playerId,
        })),
        benchPlayerIds: players.filter((p) => !assignedIds.has(p.id)).map((p) => p.id),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setLoading(false)
    }
  }

  if (players.length === 0) {
    return (
      <p className="text-sm text-kelme-gray-400">
        Selecciona jugadores antes de definir la formación.
      </p>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-kelme-gray-400">
          {footballFormatLabel(footballFormat)}
        </p>
        <label className="block text-sm font-medium">
          Esquema
          <select
            value={scheme}
            onChange={(e) => onSchemeChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
          >
            {schemes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <FormationPitch
          lineup={lineup}
          selectedSlotKey={selectedSlot}
          onSelectSlot={setSelectedSlot}
        />
        {selectedSlot && (
          <button
            type="button"
            onClick={clearSelectedSlot}
            className="text-sm text-kelme-gray-400 hover:underline"
          >
            Quitar jugador del slot {selectedSlot}
          </button>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm text-kelme-gray-400">
          {selectedSlot
            ? `Elige jugador para ${selectedSlot}`
            : 'Toca un slot en la cancha, luego elige un jugador'}
        </p>
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {players.map((p) => {
            const inPitch = assignedIds.has(p.id)
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => assignPlayerToSelected(p.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-40 ${
                    inPitch
                      ? 'border-kelme-red/40 bg-kelme-red/5'
                      : 'border-kelme-border bg-kelme-surface'
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="text-xs text-kelme-gray-400">
                    {inPitch ? 'En cancha' : 'Banco'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          disabled={loading}
          onClick={handleSave}
          className="w-full rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50"
        >
          {loading ? 'Guardando…' : saveLabel}
        </button>
        {error && <p className="text-sm text-kelme-red">{error}</p>}
      </div>
    </div>
  )
}

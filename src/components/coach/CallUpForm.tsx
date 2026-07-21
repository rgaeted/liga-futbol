'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FootballFormat } from '@prisma/client'
import { FormationEditor } from '@/components/lineup/FormationEditor'
import { minCallUpSize } from '@/lib/football-format'
import { normalizeSchemeForFormat } from '@/lib/formations'

type Player = {
  id: string
  jerseyNumber: number | null
  user: { name: string }
}

export function CallUpForm({
  matchId,
  teamId,
  footballFormat,
  players,
  initialSelected = [],
  initialScheme = '4-3-3',
  initialSlots = {},
}: {
  matchId: string
  teamId: string
  footballFormat: FootballFormat
  players: Player[]
  initialSelected?: string[]
  initialScheme?: string
  initialSlots?: Record<string, string>
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(initialSelected)
  const minPlayers = minCallUpSize(footballFormat)

  function togglePlayer(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const selectedPlayers = players
    .filter((p) => selected.includes(p.id))
    .map((p) => ({
      id: p.id,
      label: `#${p.jerseyNumber ?? '—'} ${p.user.name}`,
    }))

  const filteredInitialSlots: Record<string, string> = {}
  for (const [slotKey, playerId] of Object.entries(initialSlots)) {
    if (selected.includes(playerId)) {
      filteredInitialSlots[slotKey] = playerId
    }
  }

  async function handleSave(payload: {
    scheme: string
    slots: Array<{ slotKey: string; playerId: string }>
    benchPlayerIds: string[]
  }) {
    if (selected.length < minPlayers) {
      throw new Error(`Selecciona al menos ${minPlayers} jugadores`)
    }

    const res = await fetch(`/api/matches/${matchId}/formations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId,
        scheme: payload.scheme,
        slots: payload.slots.map((s) => ({ slotKey: s.slotKey, playerId: s.playerId })),
        benchPlayerIds: payload.benchPlayerIds,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(
        typeof data.error === 'string' ? data.error : 'No se pudo guardar la citación'
      )
    }

    router.refresh()
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold">Convocados</h2>
        <p className="text-sm text-kelme-gray-400">
          Marca al menos {minPlayers} jugadores para este partido.
        </p>
        <ul className="space-y-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-3 rounded-lg border border-kelme-border bg-kelme-surface p-3"
            >
              <input
                type="checkbox"
                checked={selected.includes(player.id)}
                onChange={() => togglePlayer(player.id)}
              />
              <span className="flex-1">
                #{player.jerseyNumber ?? '—'} {player.user.name}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-kelme-gray-400">
          {selected.length} jugador{selected.length === 1 ? '' : 'es'} seleccionado
          {selected.length === 1 ? '' : 's'}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold">Formación</h2>
        <FormationEditor
          key={`${footballFormat}-${selected.join(',')}`}
          footballFormat={footballFormat}
          initialScheme={normalizeSchemeForFormat(initialScheme, footballFormat)}
          initialSlots={filteredInitialSlots}
          players={selectedPlayers}
          onSave={handleSave}
          saveLabel="Guardar citación y formación"
        />
      </section>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import type { FootballFormat, MatchFormation } from '@prisma/client'
import { FormationEditor } from '@/components/lineup/FormationEditor'
import { normalizeSchemeForFormat, getDefaultScheme } from '@/lib/formations'

type Participation = {
  id: string
  side: 'A' | 'B'
  label: string
  slotKey: string | null
}

type Props = {
  matchId: string
  footballFormat: FootballFormat
  homeLabel: string
  awayLabel: string
  formations: MatchFormation[]
  participations: Participation[]
}

function slotsForSide(
  participations: Participation[],
  side: 'A' | 'B'
): Record<string, string> {
  const slots: Record<string, string> = {}
  for (const p of participations) {
    if (p.side === side && p.slotKey) {
      slots[p.slotKey] = p.id
    }
  }
  return slots
}

function SideEditor({
  matchId,
  side,
  label,
  footballFormat,
  scheme,
  players,
  initialSlots,
}: {
  matchId: string
  side: 'A' | 'B'
  label: string
  footballFormat: FootballFormat
  scheme: string
  players: Array<{ id: string; label: string }>
  initialSlots: Record<string, string>
}) {
  const router = useRouter()

  async function onSave(payload: {
    scheme: string
    slots: Array<{ slotKey: string; playerId: string }>
    benchPlayerIds: string[]
  }) {
    const res = await fetch(`/api/matches/${matchId}/formations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        side,
        scheme: payload.scheme,
        slots: payload.slots.map((s) => ({
          slotKey: s.slotKey,
          friendlyPlayerId: s.playerId,
        })),
        benchFriendlyPlayerIds: payload.benchPlayerIds,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(
        typeof data.error === 'string' ? data.error : 'No se pudo guardar la formación'
      )
    }
    router.refresh()
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold">{label}</h2>
      {players.length === 0 ? (
        <p className="text-sm text-kelme-gray-400">No hay jugadores en este lado.</p>
      ) : (
        <FormationEditor
          footballFormat={footballFormat}
          initialScheme={normalizeSchemeForFormat(scheme, footballFormat)}
          initialSlots={initialSlots}
          players={players}
          onSave={onSave}
        />
      )}
    </section>
  )
}

export function FriendlyLineupEditor({
  matchId,
  footballFormat,
  homeLabel,
  awayLabel,
  formations,
  participations,
}: Props) {
  const formationA = formations.find((f) => f.side === 'A')
  const formationB = formations.find((f) => f.side === 'B')

  const playersA = participations
    .filter((p) => p.side === 'A')
    .map((p) => ({ id: p.id, label: p.label }))
  const playersB = participations
    .filter((p) => p.side === 'B')
    .map((p) => ({ id: p.id, label: p.label }))

  return (
    <div className="space-y-10">
      <SideEditor
        matchId={matchId}
        side="A"
        label={homeLabel}
        footballFormat={footballFormat}
        scheme={formationA?.scheme ?? getDefaultScheme(footballFormat)}
        players={playersA}
        initialSlots={slotsForSide(participations, 'A')}
      />
      <SideEditor
        matchId={matchId}
        side="B"
        label={awayLabel}
        footballFormat={footballFormat}
        scheme={formationB?.scheme ?? getDefaultScheme(footballFormat)}
        players={playersB}
        initialSlots={slotsForSide(participations, 'B')}
      />
    </div>
  )
}

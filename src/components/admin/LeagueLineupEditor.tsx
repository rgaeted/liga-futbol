'use client'

import { useRouter } from 'next/navigation'
import type { FootballFormat } from '@prisma/client'
import { FormationEditor, type FormationSavePayload } from '@/components/lineup/FormationEditor'
import type { SlotLayout } from '@/lib/formation-slot-layout'
import { normalizeSchemeForFormat } from '@/lib/formations'

type Props = {
  matchId: string
  teamId: string
  footballFormat: FootballFormat
  label: string
  initialScheme: string
  initialSlots: Record<string, string>
  initialSlotLayout?: SlotLayout | null
  players: Array<{ id: string; label: string }>
}

export function LeagueLineupEditor({
  matchId,
  teamId,
  footballFormat,
  label,
  initialScheme,
  initialSlots,
  initialSlotLayout = null,
  players,
}: Props) {
  const router = useRouter()

  async function onSave(payload: FormationSavePayload) {
    const res = await fetch(`/api/matches/${matchId}/formations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId,
        scheme: payload.scheme,
        slots: payload.slots.map((s) => ({ slotKey: s.slotKey, playerId: s.playerId })),
        benchPlayerIds: payload.benchPlayerIds,
        slotLayout: payload.slotLayout,
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
        <p className="text-sm text-kelme-gray-400">
          Primero el coach debe citar jugadores.
        </p>
      ) : (
        <FormationEditor
          footballFormat={footballFormat}
          initialScheme={normalizeSchemeForFormat(initialScheme, footballFormat)}
          initialSlots={initialSlots}
          initialSlotLayout={initialSlotLayout}
          players={players}
          onSave={onSave}
        />
      )}
    </section>
  )
}

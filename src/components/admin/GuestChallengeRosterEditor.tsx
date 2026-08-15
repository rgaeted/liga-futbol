'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FriendlyMatchTeamAssigner } from '@/components/admin/FriendlyMatchTeamAssigner'
import type { FriendlyRosterPlayer } from '@/components/admin/FriendlyMatchConvocationPicker'
import { submitJson } from '@/components/admin/submit'
import { useOrgPath } from '@/hooks/useOrgPath'
import {
  mapToSideSets,
  rosterEntriesFromSets,
  setPlayerSide,
  toggleConvocation,
} from '@/lib/friendly-match-roster-ui'

type Props = {
  matchId: string
  sideBName: string
  friendlyPlayers: FriendlyRosterPlayer[]
  initialSideBIds: string[]
  initialSideBCaptainId: string | null
  initialSideBCoachId: string | null
}

export function GuestChallengeRosterEditor({
  matchId,
  sideBName,
  friendlyPlayers,
  initialSideBIds,
  initialSideBCaptainId,
  initialSideBCoachId,
}: Props) {
  const orgPath = useOrgPath()
  const router = useRouter()
  const [convokedIds, setConvokedIds] = useState<string[]>(initialSideBIds)
  const [sideBIds, setSideBIds] = useState<string[]>(initialSideBIds)
  const [sideBCaptainId, setSideBCaptainId] = useState<string | null>(initialSideBCaptainId)
  const [sideBCoachId, setSideBCoachId] = useState<string | null>(initialSideBCoachId)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const convokedIdSet = useMemo(() => new Set(convokedIds), [convokedIds])
  const sideBIdSet = useMemo(() => new Set(sideBIds), [sideBIds])
  const sideAIdSet = useMemo(() => new Set<string>(), [])

  const convoked = friendlyPlayers.filter((player) => convokedIdSet.has(player.id))
  const filteredRoster = friendlyPlayers.filter((player) => {
    if (!search.trim()) return true
    const label = `${player.firstName} ${player.lastName}`.toLowerCase()
    return label.includes(search.trim().toLowerCase())
  })

  function handleToggle(playerId: string, checked: boolean) {
    const next = toggleConvocation({
      playerId,
      checked,
      convokedIds: convokedIdSet,
      sideAIds: sideAIdSet,
      sideBIds: sideBIdSet,
      sideACaptainId: null,
      sideBCaptainId,
      sideACoachId: null,
      sideBCoachId,
    })
    setConvokedIds([...next.convokedIds])
    setSideBIds([...next.sideBIds])
    setSideBCaptainId(next.sideBCaptainId)
    setSideBCoachId(next.sideBCoachId)
  }

  function handleSideChange(playerId: string, side: 'A' | 'B') {
    if (side !== 'B') return
    const next = setPlayerSide({
      playerId,
      side: 'B',
      sideAIds: sideAIdSet,
      sideBIds: sideBIdSet,
      sideACaptainId: null,
      sideBCaptainId,
      sideACoachId: null,
      sideBCoachId,
    })
    setSideBIds([...next.sideBIds])
    setSideBCaptainId(next.sideBCaptainId)
    setSideBCoachId(next.sideBCoachId)
  }

  async function handleSave() {
    setError('')
    if (sideBIdSet.size < 1 || !sideBCaptainId || !sideBCoachId) {
      setError('Selecciona al menos un jugador, un capitán y un DT para tu lado.')
      return
    }

    setLoading(true)
    const result = await submitJson(`/api/matches/${matchId}`, 'PUT', {
      players: rosterEntriesFromSets(
        sideAIdSet,
        sideBIdSet,
        null,
        sideBCaptainId,
        null,
        sideBCoachId
      ),
    })
    setLoading(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    router.push(orgPath('/admin/challenges'))
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Armar tu lado</h1>
          <p className="mt-1 text-sm text-kelme-gray-500">
            Convoca jugadores de tu organización para el lado B ({sideBName}).
          </p>
        </div>
        <Link
          href={orgPath('/admin/challenges')}
          className="text-sm font-semibold text-kelme-red hover:underline"
        >
          Volver a desafíos
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="rounded-xl border border-kelme-border bg-white p-5">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar jugador…"
          className="mb-4 w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        />
        <ul className="mb-4 max-h-48 space-y-2 overflow-y-auto">
          {filteredRoster.length === 0 ? (
            <li className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No tienes jugadores amistosos en tu organización.{' '}
              <Link href={orgPath('/admin/friendly-players')} className="font-semibold underline">
                Crea jugadores
              </Link>{' '}
              antes de armar tu plantel.
            </li>
          ) : (
            filteredRoster.map((player) => (
              <li key={player.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={convokedIdSet.has(player.id)}
                  onChange={(event) => handleToggle(player.id, event.target.checked)}
                />
                <span>
                  {player.firstName} {player.lastName}
                </span>
              </li>
            ))
          )}
        </ul>

        <FriendlyMatchTeamAssigner
          convoked={convoked}
          sideAName="Anfitrión"
          sideBName={sideBName}
          sideAIds={sideAIdSet}
          sideBIds={sideBIdSet}
          sideACaptainId={null}
          sideBCaptainId={sideBCaptainId}
          sideACoachId={null}
          sideBCoachId={sideBCoachId}
          onSideChange={handleSideChange}
          onSideACaptainChange={() => undefined}
          onSideBCaptainChange={setSideBCaptainId}
          onSideACoachChange={() => undefined}
          onSideBCoachChange={setSideBCoachId}
        />

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleSave()}
          className="mt-4 rounded-lg bg-kelme-red px-4 py-2 font-semibold text-white hover:bg-kelme-red-dark disabled:opacity-50"
        >
          {loading ? 'Guardando…' : 'Guardar plantel'}
        </button>
      </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

type PlayerOption = { id: string; name: string; teamName: string | null }
type AwardOption = { id: string; name: string; emoji: string; shortLabel: string }
type SeasonOption = { id: string; name: string }

export function GrantPlayerAwardForm({
  players,
  awards,
  seasons,
  onGranted,
  onPlayerChange,
}: {
  players: PlayerOption[]
  awards: AwardOption[]
  seasons: SeasonOption[]
  onGranted?: (playerId: string) => void
  onPlayerChange?: (playerId: string) => void
}) {
  const router = useRouter()
  const [playerId, setPlayerId] = useState('')
  const [orgAwardId, setOrgAwardId] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!playerId || !orgAwardId) return
    setError('')
    setLoading(true)
    const result = await submitJson(`/api/players/${playerId}/awards`, 'POST', {
      orgAwardId,
      seasonId: seasonId || null,
      note: note.trim() || null,
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setOrgAwardId('')
    setSeasonId('')
    setNote('')
    onGranted?.(playerId)
    router.refresh()
  }

  const activeAwards = awards

  if (activeAwards.length === 0) {
    return (
      <p className="text-sm text-kelme-gray-400">
        Crea al menos un premio activo antes de otorgarlo a un jugador.
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-2"
    >
      <h2 className="font-display text-lg font-bold md:col-span-2">Otorga un premio a un jugador</h2>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-kelme-gray-400">Jugador</span>
        <select
          required
          value={playerId}
          onChange={(e) => {
            const id = e.target.value
            setPlayerId(id)
            if (id) onPlayerChange?.(id)
          }}
          className="input-kelme rounded-lg px-3 py-2"
        >
          <option value="">Selecciona un jugador</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
              {player.teamName ? ` · ${player.teamName}` : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-kelme-gray-400">Premio</span>
        <select
          required
          value={orgAwardId}
          onChange={(e) => setOrgAwardId(e.target.value)}
          className="input-kelme rounded-lg px-3 py-2"
        >
          <option value="">Selecciona un premio</option>
          {activeAwards.map((award) => (
            <option key={award.id} value={award.id}>
              {award.emoji} {award.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-kelme-gray-400">Temporada (opcional)</span>
        <select
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          className="input-kelme rounded-lg px-3 py-2"
        >
          <option value="">Premio general de la liga</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-kelme-gray-400">Nota (opcional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej. Temporada 2025"
          className="input-kelme rounded-lg px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={loading || !playerId || !orgAwardId}
        className="btn-kelme rounded-lg px-4 py-2 font-semibold disabled:opacity-50 md:col-span-2"
      >
        {loading ? 'Otorgando…' : 'Otorgar premio'}
      </button>
      {error && <p className="text-sm text-kelme-red md:col-span-2">{error}</p>}
    </form>
  )
}

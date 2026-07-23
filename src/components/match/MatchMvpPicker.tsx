'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readApiError } from '@/lib/api-error'

type Props = {
  matchId: string
  matchType: 'LEAGUE' | 'FRIENDLY'
  matchStatus: string
  players: Array<{ id: string; label: string }>
  initialPlayerId: string | null
  compact?: boolean
}

export function MatchMvpPicker({
  matchId,
  matchType,
  matchStatus,
  players,
  initialPlayerId,
  compact = false,
}: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(initialPlayerId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canEdit = matchStatus === 'FINISHED'

  async function saveMvp(playerId: string | null) {
    setSaving(true)
    setError('')
    setSuccess('')

    const body =
      matchType === 'FRIENDLY'
        ? { friendlyPlayerId: playerId }
        : { playerId }

    const res = await fetch(`/api/matches/${matchId}/mvp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSaving(false)
    if (!res.ok) {
      setError(await readApiError(res, 'No se pudo guardar el MVP'))
      return
    }

    const data = await res.json()
    setSelectedId(playerId ?? '')
    setSuccess(data.mvpLabel ? `MVP: ${data.mvpLabel}` : 'MVP eliminado')
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    await saveMvp(selectedId || null)
  }

  const wrapperClass = compact
    ? 'space-y-3 rounded-xl border border-kelme-border bg-kelme-surface p-4'
    : 'space-y-3 rounded-xl border border-kelme-border bg-kelme-gray-100 p-4'

  return (
    <form onSubmit={handleSubmit} className={wrapperClass}>
      <div>
        <h2 className="font-display text-lg font-semibold">MVP del partido</h2>
        {!compact && (
          <p className="text-sm text-kelme-gray-400">
            Elige al jugador más valioso del partido.
          </p>
        )}
      </div>

      {!canEdit ? (
        <p className="text-sm text-kelme-gray-400">
          Disponible cuando el partido esté finalizado.
        </p>
      ) : (
        <>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value)
              setSuccess('')
              setError('')
            }}
            className="w-full rounded-lg border border-kelme-border bg-white px-3 py-2 text-sm"
          >
            <option value="">Sin MVP</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || players.length === 0}
              className="rounded-lg bg-kelme-red px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar MVP'}
            </button>
            {initialPlayerId && (
              <button
                type="button"
                disabled={saving}
                onClick={() => saveMvp(null)}
                className="rounded-lg border border-kelme-border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Quitar MVP
              </button>
            )}
          </div>
        </>
      )}

      {error && <p className="text-sm text-kelme-red">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}
    </form>
  )
}

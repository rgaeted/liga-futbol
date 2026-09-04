'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PlayerAwardBadge } from '@/lib/player-awards'
import { submitJson } from './submit'
import { AwardChip } from '@/components/player/PlayerAwardBadges'

export function PlayerAwardsPanel({
  playerId,
  playerName,
}: {
  playerId: string | null
  playerName?: string
}) {
  const router = useRouter()
  const [awards, setAwards] = useState<PlayerAwardBadge[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const loadAwards = useCallback(async (id: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/players/${id}/awards`)
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? 'No se pudieron cargar los premios')
        setAwards([])
        return
      }
      const data = (await res.json()) as PlayerAwardBadge[]
      setAwards(data)
    } catch {
      setError('No se pudieron cargar los premios')
      setAwards([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!playerId) {
      setAwards([])
      setError('')
      return
    }
    void loadAwards(playerId)
  }, [playerId, loadAwards])

  async function revoke(awardId: string) {
    if (!playerId) return
    if (!window.confirm('¿Revocar este premio del jugador?')) return
    setRevokingId(awardId)
    const result = await submitJson(`/api/players/${playerId}/awards/${awardId}`, 'DELETE')
    setRevokingId(null)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setAwards((prev) => prev.filter((a) => a.id !== awardId))
    router.refresh()
  }

  if (!playerId) {
    return (
      <p className="text-sm text-kelme-gray-400">
        Selecciona un jugador arriba para ver o revocar sus premios.
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-kelme-border bg-kelme-surface p-4">
      <h3 className="font-display text-base font-bold">
        Premios de {playerName ?? 'jugador'}
      </h3>
      {loading && <p className="text-sm text-kelme-gray-400">Cargando…</p>}
      {error && <p className="text-sm text-kelme-red">{error}</p>}
      {!loading && !error && awards.length === 0 && (
        <p className="text-sm text-kelme-gray-400">Este jugador aún no tiene premios.</p>
      )}
      {!loading && awards.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {awards.map((badge) => (
            <li key={badge.id} className="inline-flex items-center gap-1">
              <AwardChip badge={badge} />
              {badge.seasonName && (
                <span className="text-xs text-kelme-gray-400">({badge.seasonName})</span>
              )}
              <button
                type="button"
                onClick={() => revoke(badge.id)}
                disabled={revokingId === badge.id}
                className="rounded border border-kelme-border px-1.5 py-0.5 text-xs text-kelme-red hover:border-kelme-red disabled:opacity-50"
                title="Revocar premio"
              >
                {revokingId === badge.id ? '…' : '×'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

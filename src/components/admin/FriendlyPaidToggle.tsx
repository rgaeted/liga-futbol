'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  matchId: string
  participationId: string
  initialPaid: boolean
  playerLabel: string
}

export function FriendlyPaidToggle({
  matchId,
  participationId,
  initialPaid,
  playerLabel,
}: Props) {
  const router = useRouter()
  const [paid, setPaid] = useState(initialPaid)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function setPaidValue(next: boolean) {
    if (loading || next === paid) return
    setLoading(true)
    setError('')
    let res: Response
    try {
      res = await fetch(
        `/api/matches/${matchId}/friendly-players/${participationId}/paid`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paid: next }),
        }
      )
    } catch {
      setLoading(false)
      setError('No se pudo conectar')
      return
    }
    setLoading(false)
    if (!res.ok) {
      let message = 'Error al actualizar'
      try {
        const data = await res.json()
        if (typeof data?.error === 'string') message = data.error
      } catch {
        // respuesta sin JSON
      }
      setError(message)
      return
    }
    setPaid(next)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="min-w-0 flex-1">{playerLabel}</span>
      <div className="flex overflow-hidden rounded-lg border border-kelme-border">
        <button
          type="button"
          disabled={loading}
          onClick={() => setPaidValue(true)}
          className={
            'px-2 py-1 text-xs font-medium ' +
            (paid
              ? 'bg-kelme-red text-white'
              : 'bg-kelme-gray-100 text-kelme-gray-400 hover:bg-kelme-gray-200')
          }
        >
          Pagó
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setPaidValue(false)}
          className={
            'px-2 py-1 text-xs font-medium ' +
            (!paid
              ? 'bg-kelme-gray-300 text-kelme-gray-900'
              : 'bg-kelme-gray-100 text-kelme-gray-400 hover:bg-kelme-gray-200')
          }
        >
          No pagó
        </button>
      </div>
      {error && <span className="text-xs text-kelme-red">{error}</span>}
    </div>
  )
}
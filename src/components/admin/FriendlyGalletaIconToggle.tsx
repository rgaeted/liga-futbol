'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  matchId: string
  participationId: string
  initialIsGalleta: boolean
}

export function FriendlyGalletaIconToggle({
  matchId,
  participationId,
  initialIsGalleta,
}: Props) {
  const router = useRouter()
  const [isGalleta, setIsGalleta] = useState(initialIsGalleta)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (loading) return
    const next = !isGalleta
    setLoading(true)

    try {
      const res = await fetch(
        `/api/matches/${matchId}/friendly-players/${participationId}/galleta`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isGalleta: next }),
        }
      )
      if (res.ok) {
        setIsGalleta(next)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void toggle()}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] disabled:opacity-50 ${
        isGalleta
          ? 'bg-amber-100 ring-1 ring-amber-300'
          : 'bg-kelme-gray-100 text-kelme-gray-400 ring-1 ring-kelme-border'
      }`}
      aria-label={isGalleta ? 'Quitar marca de galleta' : 'Marcar como galleta'}
      title={isGalleta ? 'Galleta (click para quitar)' : 'Marcar como galleta'}
    >
      🍪
    </button>
  )
}

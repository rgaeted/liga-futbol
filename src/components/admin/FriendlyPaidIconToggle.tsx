'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  matchId: string
  participationId: string
  initialPaid: boolean
}

export function FriendlyPaidIconToggle({ matchId, participationId, initialPaid }: Props) {
  const router = useRouter()
  const [paid, setPaid] = useState(initialPaid)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (loading) return
    const next = !paid
    setLoading(true)

    try {
      const res = await fetch(
        `/api/matches/${matchId}/friendly-players/${participationId}/paid`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paid: next }),
        }
      )
      if (res.ok) {
        setPaid(next)
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
      className="flex h-5 w-5 shrink-0 items-center justify-center disabled:opacity-50"
      aria-label={paid ? 'Marcó como pagó' : 'Marcar como pagó'}
    >
      {paid ? (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
          ✓
        </span>
      ) : (
        <span className="h-4 w-4 rounded-full border-2 border-kelme-gray-300 bg-white" />
      )}
    </button>
  )
}

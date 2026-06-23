'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Player = {
  id: string
  jerseyNumber: number | null
  user: { name: string }
}

export function CallUpForm({
  matchId,
  players,
}: {
  matchId: string
  players: Player[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [starters, setStarters] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function togglePlayer(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
    setStarters((prev) => prev.filter((p) => p !== id))
  }

  function toggleStarter(id: string) {
    if (!selected.includes(id)) return
    setStarters((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  async function handleSubmit() {
    if (selected.length < 7) {
      alert('Seleccioná al menos 7 jugadores')
      return
    }
    setLoading(true)
    await fetch('/api/callups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, playerIds: selected, starters }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {players.map((player) => (
          <li key={player.id} className="flex items-center gap-3 rounded-lg border border-kelme-border bg-kelme-surface p-3">
            <input
              type="checkbox"
              checked={selected.includes(player.id)}
              onChange={() => togglePlayer(player.id)}
            />
            <span className="flex-1">
              #{player.jerseyNumber ?? '—'} {player.user.name}
            </span>
            {selected.includes(player.id) && (
              <label className="flex items-center gap-2 text-sm text-kelme-gray-400">
                <input
                  type="checkbox"
                  checked={starters.includes(player.id)}
                  onChange={() => toggleStarter(player.id)}
                />
                Titular
              </label>
            )}
          </li>
        ))}
      </ul>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50"
      >
        Guardar citación ({selected.length} jugadores)
      </button>
    </div>
  )
}

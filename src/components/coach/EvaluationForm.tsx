'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Player = { id: string; user: { name: string } }

export function EvaluationForm({ players }: { players: Player[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: form.get('playerId'),
        rating: Number(form.get('rating')),
        notes: form.get('notes') || undefined,
      }),
    })
    setLoading(false)
    e.currentTarget.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-kelme-border bg-kelme-surface p-4">
      <select name="playerId" required className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        <option value="">Seleccionar jugador</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>{p.user.name}</option>
        ))}
      </select>
      <div>
        <label className="mb-2 block text-sm text-kelme-gray-400">Nota (1-10)</label>
        <input name="rating" type="range" min={1} max={10} defaultValue={7} className="w-full" />
      </div>
      <textarea name="notes" placeholder="Notas" rows={3} className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <button type="submit" disabled={loading} className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50">
        Guardar evaluación
      </button>
    </form>
  )
}

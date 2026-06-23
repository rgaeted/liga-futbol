'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Team = { id: string; name: string }

export function PlayerForm({ teams }: { teams: Team[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        name: form.get('name'),
        password: form.get('password'),
        teamId: form.get('teamId') || undefined,
        jerseyNumber: form.get('jerseyNumber')
          ? Number(form.get('jerseyNumber'))
          : undefined,
        position: form.get('position') || undefined,
      }),
    })
    setLoading(false)
    e.currentTarget.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-3">
      <input name="name" placeholder="Nombre" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
      <input name="email" type="email" placeholder="Email" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
      <input name="password" type="password" placeholder="Contraseña" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
      <select name="teamId" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
        <option value="">Sin equipo</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <input name="jerseyNumber" type="number" placeholder="Dorsal" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
      <input name="position" placeholder="Posición" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50 md:col-span-3"
      >
        Crear jugador
      </button>
    </form>
  )
}

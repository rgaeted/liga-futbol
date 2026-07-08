'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

type Team = { id: string; name: string }

export function PlayerForm({ teams }: { teams: Team[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setLoading(true)
    setError('')
    const form = new FormData(formEl)
    const result = await submitJson('/api/players', 'POST', {
      email: form.get('email'),
      name: form.get('name'),
      password: form.get('password'),
      teamId: form.get('teamId') || undefined,
      jerseyNumber: form.get('jerseyNumber')
        ? Number(form.get('jerseyNumber'))
        : undefined,
      position: form.get('position') || undefined,
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    formEl.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-3">
      <input name="name" placeholder="Nombre" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="email" type="email" placeholder="Email" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="password" type="password" placeholder="Contraseña" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <select name="teamId" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        <option value="">Sin equipo</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <input name="jerseyNumber" type="number" placeholder="Dorsal" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="position" placeholder="Posición" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50 md:col-span-3"
      >
        {loading ? 'Creando…' : 'Crear jugador'}
      </button>
      {error && <p className="text-sm text-kelme-red md:col-span-3">{error}</p>}
    </form>
  )
}

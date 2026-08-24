'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readApiError } from '@/lib/api-error'

type Team = { id: string; name: string }

export function OrgPlayerForm({ teams }: { teams: Team[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setLoading(true)
    setError('')

    const form = new FormData(formEl)
    const firstName = String(form.get('firstName') ?? '').trim()
    const lastName = String(form.get('lastName') ?? '').trim()
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '').trim()
    const name = String(form.get('name') ?? '').trim()

    if (!firstName) {
      setLoading(false)
      setError('Ingresa al menos el nombre.')
      return
    }

    const payload: Record<string, unknown> = {
      firstName,
      lastName,
      teamId: String(form.get('teamId') ?? '').trim() || undefined,
      jerseyNumber: form.get('jerseyNumber')
        ? Number(form.get('jerseyNumber'))
        : undefined,
      position: String(form.get('position') ?? '').trim() || undefined,
    }

    if (email) {
      if (!password || !name) {
        setLoading(false)
        setError('Si ingresas email, también debes ingresar nombre de cuenta y contraseña.')
        return
      }
      payload.email = email
      payload.password = password
      payload.name = name
    }

    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setLoading(false)
    if (!res.ok) {
      setError(await readApiError(res))
      return
    }

    formEl.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-3">
      <input
        name="firstName"
        placeholder="Nombre"
        required
        className="input-kelme rounded-lg px-3 py-2"
      />
      <input
        name="lastName"
        placeholder="Apellido"
        className="input-kelme rounded-lg px-3 py-2"
      />
      <select name="teamId" className="input-kelme rounded-lg px-3 py-2">
        <option value="">Sin equipo</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <input
        name="jerseyNumber"
        type="number"
        min={1}
        max={99}
        placeholder="Dorsal"
        className="input-kelme rounded-lg px-3 py-2"
      />
      <input
        name="position"
        placeholder="Posición"
        className="input-kelme rounded-lg px-3 py-2 md:col-span-2"
      />
      <p className="text-xs text-kelme-gray-500 md:col-span-3">
        Cuenta de acceso (opcional — puedes asignarla después)
      </p>
      <input
        name="email"
        type="email"
        placeholder="Email (opcional)"
        className="input-kelme rounded-lg px-3 py-2"
      />
      <input
        name="name"
        placeholder="Nombre en la cuenta (opcional)"
        className="input-kelme rounded-lg px-3 py-2"
      />
      <input
        name="password"
        type="password"
        placeholder="Contraseña (opcional)"
        className="input-kelme rounded-lg px-3 py-2"
      />
      <button
        type="submit"
        disabled={loading}
        className="btn-kelme rounded-lg px-4 py-2 font-semibold disabled:opacity-50 md:col-span-3"
      >
        {loading ? 'Creando…' : 'Crear jugador'}
      </button>
      {error && <p className="text-sm text-kelme-red md:col-span-3">{error}</p>}
    </form>
  )
}

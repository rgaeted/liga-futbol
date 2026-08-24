'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { assignableRoles } from '@/lib/validations/user'

const ROLE_LABELS: Record<(typeof assignableRoles)[number], string> = {
  ORG_ADMIN: 'Admin',
  COACH: 'DT liga',
  REFEREE: 'Árbitro',
  PLAYER: 'Jugador',
}

export function UserForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [roles, setRoles] = useState<(typeof assignableRoles)[number][]>(['COACH'])

  function toggleRole(role: (typeof assignableRoles)[number]) {
    setRoles((current) =>
      current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (roles.length === 0) {
      setError('Debes elegir al menos un rol')
      return
    }
    const formEl = e.currentTarget
    setLoading(true)
    setError('')
    const form = new FormData(formEl)
    const result = await submitJson('/api/users', 'POST', {
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password'),
      roles,
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    formEl.reset()
    setRoles(['COACH'])
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-4">
      <input name="name" placeholder="Nombre" required className="input-kelme rounded-lg px-3 py-2" />
      <input name="email" type="email" placeholder="Email" required className="input-kelme rounded-lg px-3 py-2" />
      <input name="password" type="password" placeholder="Contraseña" required className="input-kelme rounded-lg px-3 py-2" />
      <fieldset className="rounded-lg border border-kelme-border px-3 py-2 md:col-span-4">
        <legend className="px-1 text-sm font-semibold text-kelme-gray-600">Roles</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {assignableRoles.map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={roles.includes(value)}
                onChange={() => toggleRole(value)}
              />
              {ROLE_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p className="font-ui text-sm text-kelme-red md:col-span-4">{error}</p>}
      <button type="submit" disabled={loading} className="btn-kelme rounded-lg px-4 py-2 font-semibold disabled:opacity-50 md:col-span-4">
        {loading ? 'Creando...' : 'Crear usuario'}
      </button>
    </form>
  )
}

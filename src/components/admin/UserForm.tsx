'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  COACH: 'DT',
  REFEREE: 'Árbitro',
}

export function UserForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setLoading(true)
    setError('')
    const form = new FormData(formEl)
    const result = await submitJson('/api/users', 'POST', {
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password'),
      role: form.get('role'),
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
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-4">
      <input name="name" placeholder="Nombre" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="email" type="email" placeholder="Email" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="password" type="password" placeholder="Contraseña" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <select name="role" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      {error && <p className="font-ui text-sm text-kelme-red md:col-span-4">{error}</p>}
      <button type="submit" disabled={loading} className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50 md:col-span-4">
        {loading ? 'Creando...' : 'Crear usuario'}
      </button>
    </form>
  )
}

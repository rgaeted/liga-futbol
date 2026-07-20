'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import {
  FriendlyPlayerProfileFields,
  readFriendlyPlayerProfileFromForm,
} from './FriendlyPlayerProfileFields'

export function FriendlyPlayerForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setLoading(true)
    setError('')
    const form = new FormData(formEl)
    const email = String(form.get('email') ?? '').trim()
    const payload: Record<string, string> = {
      firstName: String(form.get('firstName') ?? '').trim(),
      lastName: String(form.get('lastName') ?? '').trim(),
      ...readFriendlyPlayerProfileFromForm(form),
    }
    if (email) {
      payload.email = email
      payload.password = String(form.get('password') ?? '')
    }
    const result = await submitJson('/api/friendly-players', 'POST', payload)
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
      <input
        name="firstName"
        placeholder="Nombre"
        required
        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
      />
      <input
        name="lastName"
        placeholder="Apellido"
        required
        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
      />
      <FriendlyPlayerProfileFields />
      <input
        name="email"
        type="email"
        placeholder="Email (opcional)"
        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
      />
      <input
        name="password"
        type="password"
        placeholder="Contraseña (opcional)"
        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50 md:col-span-3"
      >
        {loading ? 'Creando…' : 'Crear jugador amistoso'}
      </button>
      {error && <p className="text-sm text-kelme-red md:col-span-3">{error}</p>}
    </form>
  )
}

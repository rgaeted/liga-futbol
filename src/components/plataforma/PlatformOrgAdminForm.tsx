'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type OrgOption = { id: string; slug: string; name: string }

export function PlatformOrgAdminForm({ organizations }: { organizations: OrgOption[] }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const data = new FormData(form)
    const organizationIds = data.getAll('organizationIds').map(String)
    const password = String(data.get('password') ?? '')

    const res = await fetch('/api/plataforma/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: String(data.get('email') ?? ''),
        name: String(data.get('name') ?? ''),
        password: password.length > 0 ? password : undefined,
        organizationIds,
      }),
    })

    if (!res.ok) {
      setLoading(false)
      const body = (await res.json().catch(() => null)) as { error?: unknown } | null
      setError(
        typeof body?.error === 'string'
          ? body.error
          : 'No pudimos dar el acceso. Revisa los datos e intenta de nuevo.',
      )
      return
    }

    router.refresh()
    form.reset()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
      <h2 className="font-display text-lg font-semibold text-zinc-900">Dar acceso</h2>
      <p className="font-ui text-sm text-zinc-600">
        Si el correo ya existe, se reutiliza la cuenta (sin cambiar nombre ni contraseña) y se suma
        como administrador de las empresas que marques.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="email" type="email" placeholder="Email" required className="input-kelme" />
        <input name="name" placeholder="Nombre" required minLength={2} className="input-kelme" />
        <input
          name="password"
          type="password"
          placeholder="Contraseña (solo cuenta nueva)"
          minLength={6}
          className="input-kelme sm:col-span-2"
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="font-ui text-sm font-medium text-zinc-700">Empresas</legend>
        {organizations.length === 0 ? (
          <p className="font-ui text-sm text-zinc-500">No hay empresas activas.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {organizations.map((org) => (
              <li key={org.id}>
                <label className="flex items-center gap-2 font-ui text-sm text-zinc-800">
                  <input type="checkbox" name="organizationIds" value={org.id} className="rounded" />
                  <span>
                    {org.name}{' '}
                    <span className="text-zinc-500">/{org.slug}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      {error && <p className="font-ui text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="rounded-md bg-zinc-900 px-4 py-2 text-white">
        {loading ? 'Guardando…' : 'Dar acceso'}
      </button>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function OrganizationCreateForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const payload = {
      slug: String(form.get('slug') ?? ''),
      name: String(form.get('name') ?? ''),
      primaryColor: String(form.get('primaryColor') ?? ''),
      secondaryColor: String(form.get('secondaryColor') ?? ''),
      adminEmail: String(form.get('adminEmail') ?? ''),
      adminName: String(form.get('adminName') ?? ''),
      adminPassword: String(form.get('adminPassword') ?? ''),
    }

    const res = await fetch('/api/plataforma/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      setLoading(false)
      setError('No pudimos crear la empresa. Revisa los datos e intenta de nuevo.')
      return
    }

    router.refresh()
    e.currentTarget.reset()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
      <h2 className="font-display text-lg font-semibold text-zinc-900">Crear empresa</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="slug" placeholder="slug (ej. liga-sur)" required className="input-kelme" />
        <input name="name" placeholder="Nombre de la empresa" required className="input-kelme" />
        <input name="primaryColor" placeholder="#CD212A" required className="input-kelme" />
        <input name="secondaryColor" placeholder="#FFFFFF" required className="input-kelme" />
        <input name="adminEmail" type="email" placeholder="Email admin" required className="input-kelme" />
        <input name="adminName" placeholder="Nombre admin" required className="input-kelme" />
        <input
          name="adminPassword"
          type="password"
          placeholder="Contraseña admin"
          required
          className="input-kelme sm:col-span-2"
        />
      </div>
      {error && <p className="font-ui text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="rounded-md bg-zinc-900 px-4 py-2 text-white">
        {loading ? 'Creando…' : 'Crear empresa'}
      </button>
    </form>
  )
}

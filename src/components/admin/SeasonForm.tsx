'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

export function SeasonForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setLoading(true)
    setError('')
    const form = new FormData(formEl)
    const result = await submitJson('/api/seasons', 'POST', {
      name: form.get('name'),
      startDate: new Date(form.get('startDate') as string).toISOString(),
      endDate: new Date(form.get('endDate') as string).toISOString(),
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
      <input name="name" placeholder="Nombre temporada" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="startDate" type="date" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="endDate" type="date" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <button type="submit" disabled={loading} className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50">
        {loading ? 'Creando…' : 'Crear temporada'}
      </button>
      {error && <p className="text-sm text-kelme-red md:col-span-4">{error}</p>}
    </form>
  )
}

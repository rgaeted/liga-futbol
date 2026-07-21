'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { FOOTBALL_FORMATS, FOOTBALL_FORMAT_LABELS } from '@/lib/football-format'

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
      footballFormat: form.get('footballFormat'),
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
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-5">
      <input name="name" placeholder="Nombre temporada" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <select name="footballFormat" required defaultValue="FUTBOL_11" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        {FOOTBALL_FORMATS.map((format) => (
          <option key={format} value={format}>
            {FOOTBALL_FORMAT_LABELS[format]}
          </option>
        ))}
      </select>
      <input name="startDate" type="date" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="endDate" type="date" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <button type="submit" disabled={loading} className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50">
        {loading ? 'Creando…' : 'Crear temporada'}
      </button>
      {error && <p className="text-sm text-kelme-red md:col-span-5">{error}</p>}
    </form>
  )
}

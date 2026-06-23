'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SeasonForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    await fetch('/api/seasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        startDate: new Date(form.get('startDate') as string).toISOString(),
        endDate: new Date(form.get('endDate') as string).toISOString(),
      }),
    })
    setLoading(false)
    e.currentTarget.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-4">
      <input name="name" placeholder="Nombre temporada" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
      <input name="startDate" type="date" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
      <input name="endDate" type="date" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
      <button type="submit" disabled={loading} className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50">
        Crear temporada
      </button>
    </form>
  )
}

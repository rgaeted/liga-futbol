'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

export function FriendlyCategoryForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const body = {
      name: String(fd.get('name') ?? ''),
      description: String(fd.get('description') ?? '') || undefined,
    }
    const result = await submitJson('/api/friendly-categories', 'POST', body)
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    e.currentTarget.reset()
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-3"
    >
      <h2 className="font-display text-lg font-bold md:col-span-3">Nueva categoría</h2>
      <input
        name="name"
        required
        placeholder="Nombre"
        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
      />
      <input
        name="description"
        placeholder="Descripción (opcional)"
        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50 md:col-span-3"
      >
        {loading ? 'Creando…' : 'Crear categoría'}
      </button>
      {error && <p className="text-sm text-kelme-red md:col-span-3">{error}</p>}
    </form>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

export function TeamForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await submitJson('/api/teams', 'POST', { name, categoryId: categoryId || null })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setName('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del equipo"
          required
          className="rounded-lg border border-kelme-border bg-kelme-surface px-4 py-2"
        />
        <select
          aria-label="Categoría del equipo"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-kelme-border bg-kelme-surface px-4 py-2"
        >
          <option value="">Sin categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="btn-kelme rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
        >
          {loading ? 'Creando…' : 'Crear equipo'}
        </button>
      </div>
      {error && <p className="text-sm text-kelme-red">{error}</p>}
    </form>
  )
}

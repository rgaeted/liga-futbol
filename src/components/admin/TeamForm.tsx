'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

export function TeamForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await submitJson('/api/teams', 'POST', { name })
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
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del equipo"
          required
          className="rounded-lg border border-kelme-border bg-kelme-surface px-4 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50"
        >
          {loading ? 'Creando…' : 'Crear equipo'}
        </button>
      </div>
      {error && <p className="text-sm text-kelme-red">{error}</p>}
    </form>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function TeamForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setName('')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
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
        Crear equipo
      </button>
    </form>
  )
}

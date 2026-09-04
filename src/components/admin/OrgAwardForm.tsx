'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { EmojiPickerField } from '@/components/ui/EmojiPickerField'
import { submitJson } from './submit'

export function OrgAwardForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emoji, setEmoji] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setError('')
    setLoading(true)
    const fd = new FormData(form)
    const accentRaw = String(fd.get('accentColor') ?? '').trim()
    const sortOrderRaw = String(fd.get('sortOrder') ?? '').trim()
    const body = {
      name: String(fd.get('name') ?? ''),
      shortLabel: String(fd.get('shortLabel') ?? ''),
      emoji,
      description: String(fd.get('description') ?? '') || undefined,
      accentColor: accentRaw || undefined,
      sortOrder: sortOrderRaw ? Number(sortOrderRaw) : undefined,
    }
    const result = await submitJson('/api/org-awards', 'POST', body)
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
    form.reset()
    setEmoji('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-3"
    >
      <h2 className="font-display text-lg font-bold md:col-span-3">Nuevo premio</h2>
      <input
        name="name"
        required
        placeholder="Nombre completo"
        className="input-kelme rounded-lg px-3 py-2"
      />
      <input
        name="shortLabel"
        required
        placeholder="Etiqueta corta"
        className="input-kelme rounded-lg px-3 py-2"
      />
      <EmojiPickerField value={emoji} onChange={setEmoji} required />
      <input
        name="description"
        placeholder="Descripción (opcional)"
        className="input-kelme rounded-lg px-3 py-2 md:col-span-2"
      />
      <input
        name="accentColor"
        placeholder="#16A34A"
        pattern="^#[0-9A-Fa-f]{6}$"
        title="Color hex, ej. #16A34A"
        className="input-kelme rounded-lg px-3 py-2 font-mono text-sm"
      />
      <input
        name="sortOrder"
        type="number"
        min={0}
        placeholder="Orden"
        className="input-kelme rounded-lg px-3 py-2"
      />
      <button
        type="submit"
        disabled={loading || !emoji.trim()}
        className="btn-kelme rounded-lg px-4 py-2 font-semibold disabled:opacity-50 md:col-span-3"
      >
        {loading ? 'Creando…' : 'Crear premio'}
      </button>
      {error && <p className="text-sm text-kelme-red md:col-span-3">{error}</p>}
    </form>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readApiError } from '@/lib/api-error'

type MergeOption = {
  personId: string
  label: string
}

export function PersonMergeDialog({
  sourcePersonId,
  sourceLabel,
  options,
}: {
  sourcePersonId: string
  sourceLabel: string
  options: MergeOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [destPersonId, setDestPersonId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const available = options.filter((o) => o.personId !== sourcePersonId)

  async function merge() {
    if (!destPersonId) {
      setError('Selecciona otra ficha')
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/persons/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourcePersonId, destPersonId }),
    })
    setLoading(false)
    if (!res.ok) {
      setError(await readApiError(res))
      return
    }
    setOpen(false)
    router.refresh()
  }

  if (available.length === 0) return null

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
      >
        Fusionar con otra ficha
      </button>
      {open && (
        <div className="space-y-2 rounded-lg border border-kelme-border bg-kelme-gray-100 p-3">
          <p className="text-xs text-kelme-gray-400">
            Mover la ficha de <strong>{sourceLabel}</strong> hacia otra persona de esta organización.
          </p>
          <select
            value={destPersonId}
            onChange={(e) => setDestPersonId(e.target.value)}
            className="w-full rounded-lg border border-kelme-border bg-kelme-surface px-2 py-1 text-sm"
          >
            <option value="">Elige destino…</option>
            {available.map((option) => (
              <option key={option.personId} value={option.personId}>
                {option.label}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-kelme-red">{error}</p>}
          <button
            type="button"
            onClick={() => void merge()}
            disabled={loading}
            className="rounded-lg bg-kelme-red px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            Confirmar fusión
          </button>
        </div>
      )}
    </div>
  )
}

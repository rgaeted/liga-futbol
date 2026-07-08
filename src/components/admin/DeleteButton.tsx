'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

type Props = {
  url: string
  confirmMessage: string
}

export function DeleteButton({ url, confirmMessage }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return
    setLoading(true)
    setError('')
    const result = await submitJson(url, 'DELETE')
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded-lg border border-kelme-border px-2 py-1 text-xs text-kelme-red hover:border-kelme-red disabled:opacity-50"
      >
        {loading ? '...' : 'Eliminar'}
      </button>
      {error && <span className="text-xs text-kelme-red">{error}</span>}
    </span>
  )
}

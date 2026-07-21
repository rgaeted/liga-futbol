'use client'

import { useRef, useState } from 'react'
import { TeamCrest } from '@/components/TeamCrest'

type Props = {
  label: string
  name: string
  uploadUrl: string
  previewUrl?: string | null
  hasCrest: boolean
  color?: string | null
  onUpdated?: () => void
}

async function uploadCrest(url: string, file: File): Promise<string | null> {
  const form = new FormData()
  form.append('crest', file)
  const res = await fetch(url, { method: 'POST', body: form })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return typeof data.error === 'string' ? data.error : 'No se pudo subir el escudo'
  }
  return null
}

export function CrestUploadField({
  label,
  name,
  uploadUrl,
  previewUrl,
  hasCrest,
  color,
  onUpdated,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cacheBust, setCacheBust] = useState(0)
  const [uploaded, setUploaded] = useState(hasCrest)

  const showCrest = hasCrest || uploaded
  const displaySrc = showCrest && previewUrl ? `${previewUrl}?v=${cacheBust}` : null

  async function handleFileChange() {
    const file = inputRef.current?.files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    const message = await uploadCrest(uploadUrl, file)
    setBusy(false)
    if (message) {
      setError(message)
      return
    }
    setCacheBust(Date.now())
    setUploaded(true)
    onUpdated?.()
  }

  async function removeCrest() {
    setBusy(true)
    setError('')
    const res = await fetch(uploadUrl, { method: 'DELETE' })
    setBusy(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(typeof data.error === 'string' ? data.error : 'No se pudo quitar el escudo')
      return
    }
    if (inputRef.current) inputRef.current.value = ''
    setUploaded(false)
    setCacheBust(Date.now())
    onUpdated?.()
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-kelme-gray-600">{label}</p>
      <div className="flex items-center gap-3">
        <TeamCrest name={name} src={displaySrc} color={color} size="md" />
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red">
            {busy ? 'Subiendo…' : showCrest ? 'Cambiar' : 'Subir escudo'}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={busy}
              onChange={handleFileChange}
            />
          </label>
          {showCrest && (
            <button
              type="button"
              onClick={removeCrest}
              disabled={busy}
              className="rounded-lg border border-kelme-border px-2 py-1 text-xs text-kelme-red hover:border-kelme-red disabled:opacity-50"
            >
              Quitar
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-kelme-red">{error}</p>}
    </div>
  )
}

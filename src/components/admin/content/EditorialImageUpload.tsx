'use client'

import { useState } from 'react'

type EditorialImageUploadProps = {
  label: string
  fieldName: string
  uploadUrl: string
  deleteUrl?: string
  previewUrl?: string | null
  onUploaded?: () => void
}

export function EditorialImageUpload({
  label,
  fieldName,
  uploadUrl,
  deleteUrl,
  previewUrl,
  onUploaded,
}: EditorialImageUploadProps) {
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    setUploading(true)
    setError('')
    const form = new FormData()
    form.set(fieldName, file)
    try {
      const response = await fetch(uploadUrl, { method: 'POST', body: form })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(typeof data?.error === 'string' ? data.error : 'No se pudo subir la imagen')
        return
      }
      onUploaded?.()
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setUploading(false)
    }
  }

  async function removeImage() {
    if (!deleteUrl) return
    setUploading(true)
    setError('')
    try {
      const response = await fetch(deleteUrl, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(typeof data?.error === 'string' ? data.error : 'No se pudo eliminar la imagen')
        return
      }
      onUploaded?.()
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="h-32 w-auto rounded-lg border border-kelme-border object-cover" />
      ) : (
        <p className="text-sm text-[#8A938C]">Sin imagen</p>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
        }}
      />
      {deleteUrl && previewUrl ? (
        <button
          type="button"
          disabled={uploading}
          onClick={() => void removeImage()}
          className="rounded-lg border border-kelme-border px-3 py-2 text-sm"
        >
          Quitar imagen
        </button>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}

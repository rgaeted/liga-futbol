'use client'

import { useEffect, useId, useState } from 'react'

type EditorialImageUploadProps = {
  label: string
  fieldName: string
  uploadUrl: string
  deleteUrl?: string
  previewUrl?: string | null
  onUploaded?: () => void
}

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp'

function ImageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-7 w-7"
    >
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4.5 17 4.5-4.5 3.5 3.5 2.5-2.5 4.5 4" />
    </svg>
  )
}

export function EditorialImageUpload({
  label,
  fieldName,
  uploadUrl,
  deleteUrl,
  previewUrl,
  onUploaded,
}: EditorialImageUploadProps) {
  const inputId = useId()
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    },
    [localPreview],
  )

  const shownPreview = localPreview ?? previewUrl ?? null

  async function upload(file: File) {
    setUploading(true)
    setError('')
    setLocalPreview(typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null)
    const form = new FormData()
    form.set(fieldName, file)
    try {
      const response = await fetch(uploadUrl, { method: 'POST', body: form })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(typeof data?.error === 'string' ? data.error : 'No se pudo subir la imagen')
        setLocalPreview(null)
        return
      }
      onUploaded?.()
    } catch {
      setError('No se pudo conectar con el servidor')
      setLocalPreview(null)
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
      setLocalPreview(null)
      onUploaded?.()
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (!uploading) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files?.[0]
          if (file && !uploading) void upload(file)
        }}
        className={`flex flex-wrap items-center gap-4 rounded-xl border border-dashed p-3 transition ${
          dragging
            ? 'border-[color:var(--org-primary)] bg-[color:var(--org-primary)]/10'
            : 'border-kelme-border bg-[#0B1210]/60'
        }`}
      >
        <div className="relative flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-kelme-border bg-[#0B1210] text-[#8A938C]">
          {shownPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownPreview} alt="" className="h-full w-full object-contain p-1.5" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <ImageIcon />
              <span className="text-xs">Sin imagen</span>
            </div>
          )}
          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-semibold text-[#E8E4D8]">
              Subiendo…
            </span>
          ) : null}
        </div>

        <div className="min-w-[200px] flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={inputId}
              className={`inline-flex cursor-pointer items-center rounded-lg bg-org-primary px-3.5 py-2 text-sm font-extrabold text-[#E8E4D8] transition hover:brightness-110 ${
                uploading ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {shownPreview ? 'Cambiar imagen' : 'Elegir imagen'}
            </label>
            <input
              id={inputId}
              type="file"
              accept={ACCEPTED_TYPES}
              disabled={uploading}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void upload(file)
                event.target.value = ''
              }}
            />
            {deleteUrl && previewUrl ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => void removeImage()}
                className="rounded-lg border border-kelme-border px-3.5 py-2 text-sm font-semibold text-[#E8E4D8] transition hover:bg-[#121A18] disabled:opacity-50"
              >
                Quitar imagen
              </button>
            ) : null}
          </div>
          <p className="text-xs text-[#8A938C]">
            Arrastra una imagen aquí o elige un archivo. JPG, PNG o WebP.
          </p>
        </div>
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { FriendlyPlayerAvatar } from './FriendlyPlayerAvatar'

type Props = {
  playerId: string
  firstName: string
  lastName: string
  hasPhoto: boolean
}

export function FriendlyPlayerPhotoUpload({
  playerId,
  firstName,
  lastName,
  hasPhoto,
}: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function upload(file: File) {
    setLoading(true)
    setError('')
    const form = new FormData()
    form.append('photo', file)
    const res = await fetch(`/api/friendly-players/${playerId}/photo`, {
      method: 'POST',
      body: form,
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(typeof data.error === 'string' ? data.error : 'No se pudo subir la foto')
      return
    }
    router.refresh()
  }

  async function removePhoto() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/friendly-players/${playerId}/photo`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) {
      setError('No se pudo eliminar la foto')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <FriendlyPlayerAvatar
        id={playerId}
        firstName={firstName}
        lastName={lastName}
        hasPhoto={hasPhoto}
        size="md"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />
      <span className="inline-flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red disabled:opacity-50"
        >
          {loading ? 'Subiendo…' : hasPhoto ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {hasPhoto && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void removePhoto()}
            className="rounded-lg border border-kelme-border px-2 py-1 text-xs text-kelme-red hover:border-kelme-red disabled:opacity-50"
          >
            Quitar
          </button>
        )}
      </span>
      {error && <p className="text-xs text-kelme-red">{error}</p>}
      <p className="max-w-[10rem] text-center text-[10px] text-kelme-gray-400">
        JPG, PNG o WebP · máx. 500 KB
      </p>
    </div>
  )
}

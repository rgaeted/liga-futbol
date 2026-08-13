'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { EditorialImageUpload } from '@/components/admin/content/EditorialImageUpload'
import { submitJson } from '@/components/admin/submit'
import { editorialPublicUrl } from '@/lib/editorial/urls'

type GalleryPhoto = {
  id: string
  storagePath: string
  altText: string | null
  caption: string | null
  sortOrder: number
}

export function GalleryPhotoGrid({
  seasonId,
  galleryId,
  photos: initialPhotos,
}: {
  seasonId: string
  galleryId: string
  photos: GalleryPhoto[]
}) {
  const router = useRouter()
  const [photos, setPhotos] = useState(initialPhotos)
  const [error, setError] = useState('')

  async function reorder(nextIds: string[]) {
    setError('')
    const result = await submitJson(
      `/api/admin/seasons/${seasonId}/galleries/${galleryId}/photos/reorder`,
      'PUT',
      { photoIds: nextIds },
    )
    if (!result.ok) {
      setError(result.message)
      return
    }
    setPhotos((current) =>
      nextIds
        .map((id, index) => {
          const photo = current.find((item) => item.id === id)
          return photo ? { ...photo, sortOrder: index } : null
        })
        .filter((photo): photo is GalleryPhoto => photo !== null),
    )
    router.refresh()
  }

  function movePhoto(photoId: string, direction: -1 | 1) {
    const index = photos.findIndex((photo) => photo.id === photoId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= photos.length) return
    const nextIds = photos.map((photo) => photo.id)
    ;[nextIds[index], nextIds[target]] = [nextIds[target], nextIds[index]]
    void reorder(nextIds)
  }

  async function removePhoto(photoId: string) {
    setError('')
    const result = await submitJson(
      `/api/admin/seasons/${seasonId}/galleries/${galleryId}/photos/${photoId}`,
      'DELETE',
    )
    if (!result.ok) {
      setError(result.message)
      return
    }
    setPhotos((current) => current.filter((photo) => photo.id !== photoId))
    router.refresh()
  }

  return (
    <section className="space-y-4 rounded-lg border border-kelme-border p-4">
      <h3 className="font-display text-lg font-semibold">Fotos</h3>
      <EditorialImageUpload
        label="Agregar foto"
        fieldName="photo"
        uploadUrl={`/api/admin/seasons/${seasonId}/galleries/${galleryId}/photos`}
        onUploaded={() => router.refresh()}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {photos.map((photo, index) => (
          <article key={photo.id} className="space-y-2 rounded-lg border border-kelme-border p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={editorialPublicUrl(photo.storagePath) ?? undefined}
              alt={photo.altText ?? ''}
              className="h-40 w-full rounded-lg object-cover"
            />
            <p className="text-sm text-zinc-600">{photo.caption ?? 'Sin pie de foto'}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => movePhoto(photo.id, -1)}
                className="rounded-lg border border-kelme-border px-2 py-1 text-xs"
              >
                Subir
              </button>
              <button
                type="button"
                disabled={index === photos.length - 1}
                onClick={() => movePhoto(photo.id, 1)}
                className="rounded-lg border border-kelme-border px-2 py-1 text-xs"
              >
                Bajar
              </button>
              <button
                type="button"
                onClick={() => void removePhoto(photo.id)}
                className="rounded-lg border border-kelme-border px-2 py-1 text-xs text-red-600"
              >
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  )
}

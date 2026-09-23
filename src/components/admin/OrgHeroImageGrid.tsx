'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { EditorialImageUpload } from '@/components/admin/content/EditorialImageUpload'
import { submitJson } from '@/components/admin/submit'
import { MAX_ORG_HERO_IMAGES } from '@/lib/org-hero-images'

type OrgHeroImage = {
  id: string
  storagePath: string
  url: string | null
  sortOrder: number
}

export function OrgHeroImageGrid({
  images: initialImages,
  organizationSlug,
}: {
  images: OrgHeroImage[]
  organizationSlug: string
}) {
  const router = useRouter()
  const [images, setImages] = useState(initialImages)
  const [error, setError] = useState('')

  async function reorder(nextIds: string[]) {
    setError('')
    const result = await submitJson('/api/admin/organization/hero-images/reorder', 'PUT', {
      imageIds: nextIds,
    })
    if (!result.ok) {
      setError(result.message)
      return
    }
    setImages((current) =>
      nextIds
        .map((id, index) => {
          const image = current.find((item) => item.id === id)
          return image ? { ...image, sortOrder: index } : null
        })
        .filter((image): image is OrgHeroImage => image !== null),
    )
    router.refresh()
  }

  function moveImage(imageId: string, direction: -1 | 1) {
    const index = images.findIndex((image) => image.id === imageId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= images.length) return
    const nextIds = images.map((image) => image.id)
    ;[nextIds[index], nextIds[target]] = [nextIds[target], nextIds[index]]
    void reorder(nextIds)
  }

  async function removeImage(imageId: string) {
    setError('')
    const result = await submitJson(
      `/api/admin/organization/hero-images/${imageId}`,
      'DELETE',
    )
    if (!result.ok) {
      setError(result.message)
      return
    }
    setImages((current) => current.filter((image) => image.id !== imageId))
    router.refresh()
  }

  return (
    <section className="space-y-4 rounded-lg border border-kelme-border p-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Fotos del hero</h2>
        <p className="mt-1 text-sm text-[#8A938C]">
          Estas imágenes rotan de fondo en la portada pública. El orden de arriba a abajo es el
          orden de rotación.
        </p>
        <p className="mt-1 text-xs text-[#8A938C]">
          {images.length}/{MAX_ORG_HERO_IMAGES} fotos · JPG, PNG o WebP · máx. 2 MiB
        </p>
      </div>

      {images.length < MAX_ORG_HERO_IMAGES ? (
        <EditorialImageUpload
          label="Agregar foto"
          fieldName="photo"
          uploadUrl="/api/admin/organization/hero-images"
          onUploaded={() => router.refresh()}
        />
      ) : (
        <p className="text-sm text-[#8A938C]">
          Alcanzaste el máximo de fotos. Elimina alguna para subir otra.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {images.map((image, index) => (
          <article key={image.id} className="space-y-2 rounded-lg border border-kelme-border p-3">
            {image.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.url}
                alt=""
                className="h-40 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-kelme-border text-sm text-[#8A938C]">
                Vista previa no disponible
              </div>
            )}
            <p className="text-xs text-[#8A938C]">Posición {index + 1}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveImage(image.id, -1)}
                className="rounded-lg border border-kelme-border px-2 py-1 text-xs disabled:opacity-40"
              >
                Subir
              </button>
              <button
                type="button"
                disabled={index === images.length - 1}
                onClick={() => moveImage(image.id, 1)}
                className="rounded-lg border border-kelme-border px-2 py-1 text-xs disabled:opacity-40"
              >
                Bajar
              </button>
              <button
                type="button"
                onClick={() => void removeImage(image.id)}
                className="rounded-lg border border-kelme-border px-2 py-1 text-xs text-red-600"
              >
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-[#8A938C]">
          Sin fotos personalizadas. La landing usa la imagen predeterminada de la organización.
        </p>
      ) : null}

      <p className="text-xs text-[#8A938C]">
        Vista previa:{' '}
        <a href={`/${organizationSlug}`} className="text-kelme-red hover:underline" target="_blank" rel="noreferrer">
          /{organizationSlug}
        </a>
      </p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  )
}

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from '@/components/admin/submit'

type GalleryRow = {
  id: string
  title: string
  status: string
  photoCount: number
  publishedAt: string | null
}

export function GalleriesTable({
  seasonId,
  galleries,
}: {
  seasonId: string
  galleries: GalleryRow[]
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-kelme-border">
      <table className="min-w-full text-sm">
        <thead className="bg-kelme-gray-100">
          <tr>
            <th className="p-3 text-left">Título</th>
            <th className="p-3 text-left">Estado</th>
            <th className="p-3 text-left">Fotos</th>
            <th className="p-3 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {galleries.map((gallery) => (
            <tr key={gallery.id} className="border-t border-kelme-border">
              <td className="p-3">{gallery.title}</td>
              <td className="p-3">{gallery.status === 'PUBLISHED' ? 'Publicada' : 'Borrador'}</td>
              <td className="p-3">{gallery.photoCount}</td>
              <td className="p-3">
                <Link
                  href={`/admin/content/galleries/${gallery.id}?season=${seasonId}`}
                  className="text-kelme-red hover:underline"
                >
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function GalleryForm({
  seasonId,
  galleryId,
  initial,
}: {
  seasonId: string
  galleryId?: string
  initial?: {
    title: string
    description: string
    status: 'DRAFT' | 'PUBLISHED'
  }
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>(initial?.status ?? 'DRAFT')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    setError('')
    const payload = { title, description: description || null, status }
    const result = galleryId
      ? await submitJson(`/api/admin/seasons/${seasonId}/galleries/${galleryId}`, 'PUT', payload)
      : await submitJson(`/api/admin/seasons/${seasonId}/galleries`, 'POST', payload)
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.push(`/admin/content/galleries?season=${seasonId}`)
    router.refresh()
  }

  return (
    <section className="space-y-4 rounded-lg border border-kelme-border p-4">
      <h2 className="font-display text-lg font-semibold">
        {galleryId ? 'Editar galería' : 'Nueva galería'}
      </h2>
      <label className="block space-y-1 text-sm">
        <span>Título</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Descripción</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-24 w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Estado</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as 'DRAFT' | 'PUBLISHED')}
          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        >
          <option value="DRAFT">Borrador</option>
          <option value="PUBLISHED">Publicada</option>
        </select>
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-xl bg-kelme-red px-4 py-2 text-sm font-semibold text-white"
      >
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </section>
  )
}

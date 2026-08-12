'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from '@/components/admin/submit'

type MobileConfigFormProps = {
  seasonId: string
  initial: {
    slug: string
    displayName: string
    shortName: string
    description: string
    primaryColor: string
    secondaryColor: string
    isPublished: boolean
  }
}

export function MobileConfigForm({ seasonId, initial }: MobileConfigFormProps) {
  const router = useRouter()
  const [slug, setSlug] = useState(initial.slug)
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [shortName, setShortName] = useState(initial.shortName)
  const [description, setDescription] = useState(initial.description)
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor)
  const [secondaryColor, setSecondaryColor] = useState(initial.secondaryColor)
  const [isPublished, setIsPublished] = useState(initial.isPublished)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/admin/seasons/${seasonId}/mobile`, 'PUT', {
      slug,
      displayName,
      shortName: shortName || null,
      description: description || null,
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
      isPublished,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
  }

  return (
    <section className="space-y-4 rounded-lg border border-kelme-border p-4">
      <h2 className="font-display text-lg font-semibold">Configuración móvil</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Slug público</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Nombre visible</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Nombre corto</span>
          <input
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Color primario</span>
          <input
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#CD212A"
            className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Color secundario</span>
          <input
            value={secondaryColor}
            onChange={(e) => setSecondaryColor(e.target.value)}
            placeholder="#FFFFFF"
            className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          <span>Publicar edición móvil</span>
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span>Descripción</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-kelme-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Guardar configuración
        </button>
        {error && <p className="text-sm text-kelme-red">{error}</p>}
      </div>
    </section>
  )
}

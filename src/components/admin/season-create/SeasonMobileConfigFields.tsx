'use client'

import { nativeBundleIdPreview } from '@/lib/mobile-edition-slug'

export type SeasonMobileDraft = {
  configureMobile: boolean
  slug: string
  displayName: string
  shortName: string
  description: string
  primaryColor: string
  secondaryColor: string
}

type Props = {
  organizationSlug: string
  value: SeasonMobileDraft
  onChange: (partial: Partial<SeasonMobileDraft>) => void
  onSlugManualEdit?: () => void
}

export function SeasonMobileConfigFields({
  organizationSlug,
  value,
  onChange,
  onSlugManualEdit,
}: Props) {
  const bundleIdPreview = nativeBundleIdPreview(organizationSlug, value.slug || 'mi-temporada')

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={value.configureMobile}
          onChange={(e) => onChange({ configureMobile: e.target.checked })}
        />
        <span>Configurar app móvil ahora</span>
      </label>

      {value.configureMobile ? (
        <>
          <p className="text-sm text-kelme-gray-600">
            Define la edición pública de la app. El slug no se puede cambiar después del primer
            guardado. La publicación y el logo se configuran después en App móvil.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Slug público</span>
              <input
                value={value.slug}
                onChange={(e) => {
                  onSlugManualEdit?.()
                  onChange({ slug: e.target.value })
                }}
                placeholder="temporada-2026"
                className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
                required={value.configureMobile}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Nombre visible</span>
              <input
                value={value.displayName}
                onChange={(e) => onChange({ displayName: e.target.value })}
                placeholder="Temporada 2026"
                className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
                required={value.configureMobile}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Nombre corto</span>
              <input
                value={value.shortName}
                onChange={(e) => onChange({ shortName: e.target.value })}
                placeholder="2026"
                className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Color primario</span>
              <input
                value={value.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                placeholder="#CD212A"
                className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span>Color secundario</span>
              <input
                value={value.secondaryColor}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                placeholder="#FFFFFF"
                className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
              />
            </label>
          </div>
          <p className="rounded-lg bg-kelme-gray-50 px-3 py-2 font-mono text-xs text-kelme-gray-700">
            Identificador sugerido para la app nativa: {bundleIdPreview}
          </p>
          <label className="block space-y-1 text-sm">
            <span>Descripción</span>
            <textarea
              value={value.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
              placeholder="Breve descripción de la temporada para la app"
              className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
            />
          </label>
        </>
      ) : (
        <p className="text-sm text-kelme-gray-500">
          Puedes dejarlo para después y configurarlo desde la página App móvil de la temporada.
        </p>
      )}
    </div>
  )
}

export function createInitialMobileDraft(): SeasonMobileDraft {
  return {
    configureMobile: false,
    slug: '',
    displayName: '',
    shortName: '',
    description: '',
    primaryColor: '#CD212A',
    secondaryColor: '#FFFFFF',
  }
}

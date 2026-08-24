'use client'

import { useEffect, useState } from 'react'

type RegionOption = { code: string; name: string }
type CommuneOption = { code: string; name: string }

type Props = {
  regionCode: string
  communeCode: string
  onRegionChange: (code: string) => void
  onCommuneChange: (code: string) => void
  disabled?: boolean
}

export function ChileLocationPicker({
  regionCode,
  communeCode,
  onRegionChange,
  onCommuneChange,
  disabled = false,
}: Props) {
  const [regions, setRegions] = useState<RegionOption[]>([])
  const [communesByRegion, setCommunesByRegion] = useState<
    Record<string, CommuneOption[]>
  >({})
  const communes = regionCode ? (communesByRegion[regionCode] ?? []) : []
  const loadingCommunes =
    Boolean(regionCode) && !(regionCode in communesByRegion)

  useEffect(() => {
    fetch('/api/chile-locations')
      .then((res) => res.json())
      .then((data: { regions: RegionOption[] }) => setRegions(data.regions ?? []))
      .catch(() => setRegions([]))
  }, [])

  useEffect(() => {
    if (!regionCode || regionCode in communesByRegion) return

    let cancelled = false
    fetch(`/api/chile-locations?regionCode=${encodeURIComponent(regionCode)}`)
      .then((res) => res.json())
      .then((data: { communes: CommuneOption[] }) => {
        if (cancelled) return
        setCommunesByRegion((current) => ({
          ...current,
          [regionCode]: data.communes ?? [],
        }))
      })
      .catch(() => {
        if (cancelled) return
        setCommunesByRegion((current) => ({
          ...current,
          [regionCode]: [],
        }))
      })

    return () => {
      cancelled = true
    }
  }, [communesByRegion, regionCode])

  function handleRegionChange(next: string) {
    onRegionChange(next)
    onCommuneChange('')
  }

  return (
    <fieldset
      disabled={disabled}
      className="rounded-xl border border-kelme-border bg-kelme-gray-50/80 p-4 md:col-span-3"
    >
      <legend className="px-1 font-ui text-sm font-semibold text-kelme-gray-900">
        Ubicación en Chile
      </legend>
      <p className="mt-1 text-xs text-kelme-gray-500">
        Opcional. Sirve para registrar el clima del partido según la comuna y la hora programada.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select
          value={regionCode}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="rounded-lg border border-kelme-border bg-kelme-surface px-3 py-2 text-sm"
        >
          <option value="">Región</option>
          {regions.map((region) => (
            <option key={region.code} value={region.code}>
              {region.name}
            </option>
          ))}
        </select>
        <select
          value={communeCode}
          onChange={(e) => onCommuneChange(e.target.value)}
          disabled={!regionCode || loadingCommunes}
          className="rounded-lg border border-kelme-border bg-kelme-surface px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="">
            {loadingCommunes ? 'Cargando comunas…' : 'Comuna'}
          </option>
          {communes.map((commune) => (
            <option key={commune.code} value={commune.code}>
              {commune.name}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  )
}

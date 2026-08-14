'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useOrgPath } from '@/hooks/useOrgPath'

type SeasonOption = {
  id: string
  name: string
}

export function ContentSeasonBar({
  seasons,
  selectedSeasonId,
}: {
  seasons: SeasonOption[]
  selectedSeasonId: string | null
}) {
  const orgPath = useOrgPath()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onSeasonChange(seasonId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('season', seasonId)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-kelme-border bg-white p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-700">Temporada</p>
        <select
          value={selectedSeasonId ?? ''}
          onChange={(event) => onSeasonChange(event.target.value)}
          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 text-sm"
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
            </option>
          ))}
        </select>
      </div>
      {selectedSeasonId ? (
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={orgPath(`/admin/content?season=${selectedSeasonId}`)} className="rounded-lg px-3 py-2 hover:bg-zinc-100">
            Resumen
          </Link>
          <Link
            href={orgPath(`/admin/content/articles?season=${selectedSeasonId}`)}
            className="rounded-lg px-3 py-2 hover:bg-zinc-100"
          >
            Noticias
          </Link>
          <Link
            href={orgPath(`/admin/content/galleries?season=${selectedSeasonId}`)}
            className="rounded-lg px-3 py-2 hover:bg-zinc-100"
          >
            Galerías
          </Link>
          <Link
            href={orgPath(`/admin/content/sponsors?season=${selectedSeasonId}`)}
            className="rounded-lg px-3 py-2 hover:bg-zinc-100"
          >
            Patrocinadores
          </Link>
        </div>
      ) : null}
    </div>
  )
}

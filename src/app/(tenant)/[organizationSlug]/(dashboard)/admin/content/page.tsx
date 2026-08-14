import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ContentSeasonBar } from '@/components/admin/content/ContentSeasonBar'
import { MobileEditionLogoUpload } from '@/components/admin/content/MobileEditionLogoUpload'
import { db } from '@/lib/db'
import { orgPath } from '@/lib/tenant-paths'

export default async function AdminContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const { organizationSlug } = await params
  const query = await searchParams
  const seasons = await db.season.findMany({ orderBy: { startDate: 'desc' } })
  const selectedSeasonId = query.season ?? seasons[0]?.id ?? null
  if (!selectedSeasonId && seasons.length > 0) {
    redirect(orgPath(organizationSlug, `/admin/content?season=${seasons[0].id}`))
  }

  const mobileConfig = selectedSeasonId
    ? await db.seasonMobileConfig.findUnique({ where: { seasonId: selectedSeasonId } })
    : null

  const [articleCount, galleryCount, sponsorCount] = selectedSeasonId
    ? await Promise.all([
        db.article.count({ where: { seasonId: selectedSeasonId } }),
        db.gallery.count({ where: { seasonId: selectedSeasonId } }),
        db.sponsor.count({ where: { seasonId: selectedSeasonId } }),
      ])
    : [0, 0, 0]

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Contenido editorial</h1>
      <ContentSeasonBar
        seasons={seasons.map((season) => ({ id: season.id, name: season.name }))}
        selectedSeasonId={selectedSeasonId}
      />
      {selectedSeasonId ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href={orgPath(organizationSlug, `/admin/content/articles?season=${selectedSeasonId}`)}
              className="rounded-lg border border-kelme-border p-4 hover:bg-kelme-gray-50"
            >
              <p className="text-sm text-zinc-500">Noticias</p>
              <p className="text-2xl font-bold">{articleCount}</p>
            </Link>
            <Link
              href={orgPath(organizationSlug, `/admin/content/galleries?season=${selectedSeasonId}`)}
              className="rounded-lg border border-kelme-border p-4 hover:bg-kelme-gray-50"
            >
              <p className="text-sm text-zinc-500">Galerías</p>
              <p className="text-2xl font-bold">{galleryCount}</p>
            </Link>
            <Link
              href={orgPath(organizationSlug, `/admin/content/sponsors?season=${selectedSeasonId}`)}
              className="rounded-lg border border-kelme-border p-4 hover:bg-kelme-gray-50"
            >
              <p className="text-sm text-zinc-500">Patrocinadores</p>
              <p className="text-2xl font-bold">{sponsorCount}</p>
            </Link>
          </div>
          {mobileConfig ? (
            <MobileEditionLogoUpload
              seasonId={selectedSeasonId}
              logoStoragePath={mobileConfig.logoStoragePath}
            />
          ) : (
            <p className="rounded-lg border border-kelme-border p-4 text-sm text-zinc-600">
              Configura la edición móvil de esta temporada antes de subir el logo.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-zinc-600">Crea una temporada para gestionar contenido editorial.</p>
      )}
    </div>
  )
}

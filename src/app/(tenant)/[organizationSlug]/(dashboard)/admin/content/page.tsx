import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ContentSeasonBar } from '@/components/admin/content/ContentSeasonBar'
import { MobileEditionLogoUpload } from '@/components/admin/content/MobileEditionLogoUpload'
import { db } from '@/lib/db'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'

export default async function AdminContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const { organizationSlug } = await params
  const query = await searchParams
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }
  const seasons = await db.season.findMany({
    where: { organizationId },
    orderBy: { startDate: 'desc' },
  })
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
              className="rounded-lg border border-kelme-border p-4 hover:bg-[#0B1210]"
            >
              <p className="text-sm text-[#8A938C]">Noticias</p>
              <p className="text-2xl font-bold">{articleCount}</p>
            </Link>
            <Link
              href={orgPath(organizationSlug, `/admin/content/galleries?season=${selectedSeasonId}`)}
              className="rounded-lg border border-kelme-border p-4 hover:bg-[#0B1210]"
            >
              <p className="text-sm text-[#8A938C]">Galerías</p>
              <p className="text-2xl font-bold">{galleryCount}</p>
            </Link>
            <Link
              href={orgPath(organizationSlug, `/admin/content/sponsors?season=${selectedSeasonId}`)}
              className="rounded-lg border border-kelme-border p-4 hover:bg-[#0B1210]"
            >
              <p className="text-sm text-[#8A938C]">Patrocinadores</p>
              <p className="text-2xl font-bold">{sponsorCount}</p>
            </Link>
          </div>
          {mobileConfig ? (
            <>
              <section className="rounded-lg border border-kelme-border p-4 text-sm">
                <h2 className="font-display text-lg font-semibold">App de esta edición</h2>
                <p className="mt-2 text-[#8A938C]">
                  Estado: {mobileConfig.isPublished ? 'Publicado' : 'Borrador'} · Slug:{' '}
                  <span className="font-mono text-xs">{mobileConfig.slug}</span>
                </p>
              </section>
              <MobileEditionLogoUpload
                seasonId={selectedSeasonId}
                logoStoragePath={mobileConfig.logoStoragePath}
              />
            </>
          ) : (
            <p className="rounded-lg border border-kelme-border p-4 text-sm text-[#8A938C]">
              Configura la edición móvil de esta temporada antes de subir el logo.{' '}
              <Link
                href={orgPath(organizationSlug, `/admin/seasons/${selectedSeasonId}/mobile`)}
                className="text-kelme-red hover:underline"
              >
                Ir al wizard móvil
              </Link>
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-[#8A938C]">Crea una temporada para gestionar contenido editorial.</p>
      )}
    </div>
  )
}

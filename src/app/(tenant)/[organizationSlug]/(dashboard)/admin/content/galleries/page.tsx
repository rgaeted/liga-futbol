import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ContentSeasonBar } from '@/components/admin/content/ContentSeasonBar'
import { GalleriesTable } from '@/components/admin/content/GalleriesTable'
import { db } from '@/lib/db'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'

export default async function AdminGalleriesPage({
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
    redirect(orgPath(organizationSlug, `/admin/content/galleries?season=${seasons[0].id}`))
  }

  const galleries = selectedSeasonId
    ? await db.gallery.findMany({
        where: { seasonId: selectedSeasonId },
        include: { _count: { select: { photos: true } } },
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      })
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Galerías</h1>
        {selectedSeasonId ? (
          <Link
            href={orgPath(organizationSlug, `/admin/content/galleries/new?season=${selectedSeasonId}`)}
            className="rounded-xl bg-kelme-red px-4 py-2 text-sm font-semibold text-white"
          >
            Nueva galería
          </Link>
        ) : null}
      </div>
      <ContentSeasonBar
        seasons={seasons.map((season) => ({ id: season.id, name: season.name }))}
        selectedSeasonId={selectedSeasonId}
      />
      {selectedSeasonId ? (
        <GalleriesTable
          seasonId={selectedSeasonId}
          galleries={galleries.map((gallery) => ({
            id: gallery.id,
            title: gallery.title,
            status: gallery.status,
            photoCount: gallery._count.photos,
            publishedAt: gallery.publishedAt?.toISOString() ?? null,
          }))}
        />
      ) : null}
    </div>
  )
}

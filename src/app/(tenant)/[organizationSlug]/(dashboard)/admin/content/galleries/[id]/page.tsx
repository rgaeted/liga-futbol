import { notFound, redirect } from 'next/navigation'
import { ContentSeasonBar } from '@/components/admin/content/ContentSeasonBar'
import { EditorialImageUpload } from '@/components/admin/content/EditorialImageUpload'
import { GalleryForm } from '@/components/admin/content/GalleriesTable'
import { GalleryPhotoGrid } from '@/components/admin/content/GalleryPhotoGrid'
import { db } from '@/lib/db'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'

export default async function AdminGalleryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string; id: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const { organizationSlug, id } = await params
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

  if (id === 'new') {
    const selectedSeasonId = query.season ?? seasons[0]?.id
    if (!selectedSeasonId) redirect(orgPath(organizationSlug, '/admin/content/galleries'))
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Nueva galería</h1>
        <ContentSeasonBar
          seasons={seasons.map((season) => ({ id: season.id, name: season.name }))}
          selectedSeasonId={selectedSeasonId}
        />
        <GalleryForm seasonId={selectedSeasonId} />
      </div>
    )
  }

  const gallery = await db.gallery.findUnique({
    where: { id },
    include: {
      photos: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  })
  if (!gallery) notFound()

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Editar galería</h1>
      <ContentSeasonBar
        seasons={seasons.map((season) => ({ id: season.id, name: season.name }))}
        selectedSeasonId={gallery.seasonId}
      />
      <GalleryForm
        seasonId={gallery.seasonId}
        galleryId={gallery.id}
        initial={{
          title: gallery.title,
          description: gallery.description ?? '',
          status: gallery.status,
        }}
      />
      <EditorialImageUpload
        label="Portada"
        fieldName="cover"
        uploadUrl={`/api/admin/seasons/${gallery.seasonId}/galleries/${gallery.id}/cover`}
        deleteUrl={`/api/admin/seasons/${gallery.seasonId}/galleries/${gallery.id}/cover`}
        previewUrl={editorialPublicUrl(gallery.coverStoragePath)}
      />
      <GalleryPhotoGrid
        seasonId={gallery.seasonId}
        galleryId={gallery.id}
        photos={gallery.photos.map((photo) => ({
          id: photo.id,
          storagePath: photo.storagePath,
          altText: photo.altText,
          caption: photo.caption,
          sortOrder: photo.sortOrder,
        }))}
      />
    </div>
  )
}

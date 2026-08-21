import { redirect, notFound } from 'next/navigation'
import { ContentSeasonBar } from '@/components/admin/content/ContentSeasonBar'
import { SponsorForm, SponsorsTable } from '@/components/admin/content/SponsorsTable'
import { db } from '@/lib/db'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'

export default async function AdminSponsorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string }>
  searchParams: Promise<{ season?: string; edit?: string }>
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
    redirect(orgPath(organizationSlug, `/admin/content/sponsors?season=${seasons[0].id}`))
  }

  const sponsors = selectedSeasonId
    ? await db.sponsor.findMany({
        where: { seasonId: selectedSeasonId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
    : []

  const editing = query.edit
    ? sponsors.find((sponsor) => sponsor.id === query.edit)
    : null

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Patrocinadores</h1>
      <ContentSeasonBar
        seasons={seasons.map((season) => ({ id: season.id, name: season.name }))}
        selectedSeasonId={selectedSeasonId}
      />
      {selectedSeasonId ? (
        <>
          <SponsorForm
            seasonId={selectedSeasonId}
            sponsorId={editing?.id}
            initial={
              editing
                ? {
                    name: editing.name,
                    websiteUrl: editing.websiteUrl ?? '',
                    placement: editing.placement,
                    startsAt: editing.startsAt
                      ? editing.startsAt.toISOString().slice(0, 16)
                      : '',
                    endsAt: editing.endsAt ? editing.endsAt.toISOString().slice(0, 16) : '',
                    isActive: editing.isActive,
                  }
                : undefined
            }
          />
          <SponsorsTable
            seasonId={selectedSeasonId}
            sponsors={sponsors.map((sponsor) => ({
              id: sponsor.id,
              name: sponsor.name,
              placement: sponsor.placement,
              isActive: sponsor.isActive,
              startsAt: sponsor.startsAt?.toISOString() ?? null,
              endsAt: sponsor.endsAt?.toISOString() ?? null,
            }))}
          />
        </>
      ) : null}
    </div>
  )
}

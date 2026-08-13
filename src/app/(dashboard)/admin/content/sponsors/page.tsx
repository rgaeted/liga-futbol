import { redirect } from 'next/navigation'
import { ContentSeasonBar } from '@/components/admin/content/ContentSeasonBar'
import { SponsorForm, SponsorsTable } from '@/components/admin/content/SponsorsTable'
import { db } from '@/lib/db'

export default async function AdminSponsorsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; edit?: string }>
}) {
  const params = await searchParams
  const seasons = await db.season.findMany({ orderBy: { startDate: 'desc' } })
  const selectedSeasonId = params.season ?? seasons[0]?.id ?? null
  if (!selectedSeasonId && seasons.length > 0) {
    redirect(`/admin/content/sponsors?season=${seasons[0].id}`)
  }

  const sponsors = selectedSeasonId
    ? await db.sponsor.findMany({
        where: { seasonId: selectedSeasonId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
    : []

  const editing = params.edit
    ? sponsors.find((sponsor) => sponsor.id === params.edit)
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

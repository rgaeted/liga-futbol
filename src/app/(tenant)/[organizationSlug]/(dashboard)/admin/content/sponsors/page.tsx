import { redirect, notFound } from 'next/navigation'
import { ContentSeasonBar } from '@/components/admin/content/ContentSeasonBar'
import { SponsorAssignments } from '@/components/admin/content/SponsorAssignments'
import { SponsorForm, SponsorsTable } from '@/components/admin/content/SponsorsTable'
import { db } from '@/lib/db'
import { listSponsorAssignmentSlots, listSponsorStats } from '@/lib/editorial/sponsors'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import { resolveSelectedSeasonId } from '@/lib/sponsors/season-select'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'

/** Logo del auspiciador con versión, para que un logo reemplazado se vea de inmediato. */
function sponsorLogoUrl(sponsor: { logoStoragePath: string | null; updatedAt: Date }): string | null {
  const url = editorialPublicUrl(sponsor.logoStoragePath)
  return url ? `${url}?v=${sponsor.updatedAt.getTime()}` : null
}

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
  const selectedSeasonId = resolveSelectedSeasonId(seasons, query.season)
  if (!selectedSeasonId && seasons.length > 0) {
    redirect(orgPath(organizationSlug, `/admin/content/sponsors?season=${seasons[0].id}`))
  }

  const sponsors = selectedSeasonId
    ? await db.sponsor.findMany({
        where: { seasonId: selectedSeasonId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
    : []

  const [slots, stats] = selectedSeasonId
    ? await Promise.all([
        listSponsorAssignmentSlots(selectedSeasonId),
        listSponsorStats(selectedSeasonId, new Date()),
      ])
    : [[], {}]
  const emptyStats = { current: { views: 0, clicks: 0 }, previous: { views: 0, clicks: 0 } }

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
          <SponsorsTable
            seasonId={selectedSeasonId}
            selectedId={editing?.id ?? null}
            sponsors={sponsors.map((sponsor) => ({
              id: sponsor.id,
              name: sponsor.name,
              placement: sponsor.placement,
              tier: sponsor.tier,
              showOnLanding: sponsor.showOnLanding,
              isActive: sponsor.isActive,
              startsAt: sponsor.startsAt?.toISOString() ?? null,
              endsAt: sponsor.endsAt?.toISOString() ?? null,
              stats: stats[sponsor.id] ?? emptyStats,
              logoUrl: sponsorLogoUrl(sponsor),
            }))}
          />
          <SponsorForm
            key={editing?.id ?? 'nuevo'}
            seasonId={selectedSeasonId}
            sponsorId={editing?.id}
            logoUrl={editing ? sponsorLogoUrl(editing) : null}
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
                    tier: editing.tier,
                    showOnLanding: editing.showOnLanding,
                    tagline: editing.tagline ?? '',
                    ctaLabel: editing.ctaLabel ?? '',
                    ctaUrl: editing.ctaUrl ?? '',
                  }
                : undefined
            }
          />
          <SponsorAssignments
            key={slots.map((slot) => `${slot.target}:${slot.sponsorId ?? ''}`).join('|')}
            seasonId={selectedSeasonId}
            slots={slots}
            sponsors={sponsors.map((sponsor) => ({ id: sponsor.id, name: sponsor.name }))}
          />
        </>
      ) : null}
    </div>
  )
}

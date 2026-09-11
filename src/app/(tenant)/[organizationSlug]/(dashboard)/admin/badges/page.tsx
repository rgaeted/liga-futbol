import { notFound } from 'next/navigation'
import { getBadgeDefinition } from '@/lib/badges/registry'
import { db } from '@/lib/db'
import { requireOrganizationId } from '@/lib/tenant-access'
import { OrgBadgesAdminSection } from '@/components/admin/OrgBadgesAdminSection'

export const dynamic = 'force-dynamic'

export default async function AdminBadgesPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const [organization, badges] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { badgesEnabled: true },
    }),
    db.orgBadge.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { playerBadges: true } } },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Insignias</h1>
        <p className="mt-1 text-sm text-kelme-gray-400">
          Catálogo de insignias que se otorgan solas al terminar cada partido.
        </p>
      </div>
      <OrgBadgesAdminSection
        badgesEnabled={organization.badgesEnabled}
        initialBadges={badges.map((badge) => ({
          id: badge.id,
          predicateId: badge.predicateId,
          name: badge.name,
          description: badge.description,
          family: badge.family,
          rarity: badge.rarity,
          iconKey: badge.iconKey,
          thresholds: badge.thresholds as Record<string, number>,
          isActive: badge.isActive,
          sortOrder: badge.sortOrder,
          evaluable: getBadgeDefinition(badge.predicateId).evaluable,
          playerCount: badge._count.playerBadges,
        }))}
      />
    </div>
  )
}

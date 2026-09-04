import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireOrganizationId } from '@/lib/tenant-access'
import { listOrgAwardsWithCounts } from '@/lib/org-awards'
import { playerDisplayName } from '@/lib/person-name'
import { AwardsAdminSection } from '@/components/admin/AwardsAdminSection'

export const dynamic = 'force-dynamic'

export default async function AdminAwardsPage({
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

  const [awards, players, seasons] = await Promise.all([
    listOrgAwardsWithCounts(organizationId),
    db.player.findMany({
      where: { organizationId },
      include: {
        person: { include: { user: { select: { name: true } } } },
        team: { select: { name: true } },
      },
      orderBy: { person: { lastName: 'asc' } },
    }),
    db.season.findMany({
      where: { organizationId, isActive: true },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Premios</h1>
        <p className="mt-1 text-sm text-kelme-gray-400">
          Define premios de la liga y otórgalos a jugadores. Se verán como badges en su panel.
        </p>
      </div>
      <AwardsAdminSection
        initialAwards={awards.map((a) => ({
          id: a.id,
          name: a.name,
          shortLabel: a.shortLabel,
          emoji: a.emoji,
          description: a.description,
          accentColor: a.accentColor,
          sortOrder: a.sortOrder,
          isActive: a.isActive,
          playerCount: a._count.playerAwards,
        }))}
        players={players.map((p) => ({
          id: p.id,
          name: playerDisplayName(p),
          teamName: p.team?.name ?? null,
        }))}
        seasons={seasons}
      />
    </div>
  )
}

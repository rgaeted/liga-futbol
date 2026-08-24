import { notFound } from 'next/navigation'
import { SeasonTeamStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { requireOrganizationId } from '@/lib/tenant-access'
import { LeagueMatchCreateWizard } from '@/components/admin/match-create/LeagueMatchCreateWizard'

export default async function NewLeagueMatchPage({
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

  const [seasons, refereeMemberships] = await Promise.all([
    db.season.findMany({
      where: { organizationId },
      orderBy: { startDate: 'desc' },
      include: {
        seasonCategories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            category: { select: { id: true, name: true } },
            seasonTeams: {
              where: { status: SeasonTeamStatus.REGISTERED },
              include: { team: { select: { id: true, name: true } } },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    }),
    db.organizationMembership.findMany({
      where: { organizationId, roles: { has: MembershipRole.REFEREE } },
      include: { user: { select: { id: true, name: true } } },
    }),
  ])

  return (
    <LeagueMatchCreateWizard
      seasons={seasons.map((season) => ({
        id: season.id,
        name: season.name,
        footballFormat: season.footballFormat,
        categories: season.seasonCategories.map((sc) => ({
          seasonCategoryId: sc.id,
          categoryId: sc.category.id,
          name: sc.category.name,
          teams: sc.seasonTeams.map((st) => ({
            id: st.team.id,
            name: st.team.name,
          })),
        })),
      }))}
      referees={refereeMemberships.map((m) => m.user)}
    />
  )
}

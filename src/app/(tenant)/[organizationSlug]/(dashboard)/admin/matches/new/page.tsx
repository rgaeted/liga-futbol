import { notFound } from 'next/navigation'
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

  const [seasons, teams, refereeMemberships] = await Promise.all([
    db.season.findMany({ where: { organizationId }, orderBy: { startDate: 'desc' } }),
    db.team.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }),
    db.organizationMembership.findMany({
      where: { organizationId, role: MembershipRole.REFEREE },
      include: { user: { select: { id: true, name: true } } },
    }),
  ])

  return (
    <LeagueMatchCreateWizard
      seasons={seasons.map((season) => ({
        id: season.id,
        name: season.name,
        footballFormat: season.footballFormat,
      }))}
      teams={teams}
      referees={refereeMemberships.map((m) => m.user)}
    />
  )
}

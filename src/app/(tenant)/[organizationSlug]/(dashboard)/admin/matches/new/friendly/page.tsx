import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { requireOrganizationId } from '@/lib/tenant-access'
import { FriendlyMatchCreateWizard } from '@/components/admin/match-create/FriendlyMatchCreateWizard'

export default async function NewFriendlyMatchPage({
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

  const [refereeMemberships, friendlyCategories, friendlyPlayers, teams] = await Promise.all([
    db.organizationMembership.findMany({
      where: { organizationId, role: MembershipRole.REFEREE },
      include: { user: { select: { id: true, name: true } } },
    }),
    db.friendlyCategory.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }),
    db.player.findMany({
      where: { organizationId },
      orderBy: { person: { lastName: 'asc' } },
      select: {
        id: true,
        teamId: true,
        primaryPosition: true,
        person: {
          select: {
            firstName: true,
            lastName: true,
            photoMimeType: true,
          },
        },
        categories: { select: { friendlyCategoryId: true } },
      },
    }),
    db.team.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }),
  ])

  const rosterPlayers = friendlyPlayers.map((player) => ({
    id: player.id,
    firstName: player.person.firstName,
    lastName: player.person.lastName,
    categoryIds: player.categories.map((category) => category.friendlyCategoryId),
    primaryPosition: player.primaryPosition,
    hasPhoto: Boolean(player.person.photoMimeType),
    teamId: player.teamId,
  }))

  return (
    <FriendlyMatchCreateWizard
      referees={refereeMemberships.map((m) => m.user)}
      categories={friendlyCategories.map((category) => ({
        id: category.id,
        name: category.name,
        isActive: category.isActive,
      }))}
      friendlyPlayers={rosterPlayers}
      teams={teams.map((team) => ({ id: team.id, name: team.name }))}
    />
  )
}

import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { playerDisplayName, PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'
import { requireOrganizationId } from '@/lib/tenant-access'
import { SeasonCreateWizard } from '@/components/admin/season-create/SeasonCreateWizard'

export default async function NewSeasonPage({
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

  const teams = await db.team.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
    include: {
      players: {
        include: PLAYER_PERSON_NAME_INCLUDE,
        orderBy: { jerseyNumber: 'asc' },
      },
    },
  })

  return (
    <SeasonCreateWizard
      organizationSlug={organizationSlug}
      teams={teams.map((team) => ({
        teamId: team.id,
        name: team.name,
        color: team.color,
        players: team.players.map((player) => ({
          id: player.id,
          name: playerDisplayName(player),
          jerseyNumber: player.jerseyNumber,
          position: player.position,
        })),
        selectedPlayerIds: [],
      }))}
    />
  )
}

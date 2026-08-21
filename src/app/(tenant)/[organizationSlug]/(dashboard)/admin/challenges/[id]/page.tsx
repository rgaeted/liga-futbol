import { notFound } from 'next/navigation'
import { ChallengeStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOrganizationId } from '@/lib/tenant-access'
import { GuestChallengeRosterEditor } from '@/components/admin/GuestChallengeRosterEditor'

export default async function GuestChallengeRosterPage({
  params,
}: {
  params: Promise<{ organizationSlug: string; id: string }>
}) {
  const { organizationSlug, id } = await params
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const [match, orgPlayers, teams] = await Promise.all([
    db.match.findUnique({
      where: { id },
      include: {
        friendlyPlayers: {
          where: { side: 'B' },
          select: {
            playerId: true,
            isCaptain: true,
            isCoach: true,
          },
        },
      },
    }),
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

  if (
    !match ||
    match.guestOrganizationId !== organizationId ||
    match.challengeStatus !== ChallengeStatus.ACCEPTED
  ) {
    notFound()
  }

  const sideBRows = match.friendlyPlayers
  const sideBCaptain = sideBRows.find((row) => row.isCaptain)
  const sideBCoach = sideBRows.find((row) => row.isCoach)

  return (
    <GuestChallengeRosterEditor
      matchId={match.id}
      sideBName={match.sideBName ?? 'Visitante'}
      teams={teams.map((team) => ({ id: team.id, name: team.name }))}
      friendlyPlayers={orgPlayers.map((player) => ({
        id: player.id,
        firstName: player.person.firstName,
        lastName: player.person.lastName,
        categoryIds: player.categories.map((category) => category.friendlyCategoryId),
        primaryPosition: player.primaryPosition,
        hasPhoto: Boolean(player.person.photoMimeType),
        teamId: player.teamId,
      }))}
      initialSideBIds={sideBRows.map((row) => row.playerId)}
      initialSideBCaptainId={sideBCaptain?.playerId ?? null}
      initialSideBCoachId={sideBCoach?.playerId ?? null}
    />
  )
}

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

  const match = await db.match.findUnique({
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
  })

  if (
    !match ||
    match.guestOrganizationId !== organizationId ||
    match.challengeStatus !== ChallengeStatus.ACCEPTED
  ) {
    notFound()
  }

  const orgPlayers = await db.player.findMany({
    where: { organizationId },
    orderBy: { person: { lastName: 'asc' } },
    select: {
      id: true,
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
  })

  const sideBRows = match.friendlyPlayers
  const sideBCaptain = sideBRows.find((row) => row.isCaptain)
  const sideBCoach = sideBRows.find((row) => row.isCoach)

  return (
    <GuestChallengeRosterEditor
      matchId={match.id}
      sideBName={match.sideBName ?? 'Visitante'}
      friendlyPlayers={orgPlayers.map((player) => ({
        id: player.id,
        firstName: player.person.firstName,
        lastName: player.person.lastName,
        categoryIds: player.categories.map((category) => category.friendlyCategoryId),
        primaryPosition: player.primaryPosition,
        hasPhoto: Boolean(player.person.photoMimeType),
      }))}
      initialSideBIds={sideBRows.map((row) => row.playerId)}
      initialSideBCaptainId={sideBCaptain?.playerId ?? null}
      initialSideBCoachId={sideBCoach?.playerId ?? null}
    />
  )
}

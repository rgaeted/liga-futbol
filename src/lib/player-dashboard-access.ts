import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { findPlayerInOrganization } from '@/lib/player-org-profile'
import { requireOrganizationId } from '@/lib/tenant-access'

export async function requirePlayerDashboardContext(organizationSlug: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    redirect('/login')
  }

  const player = await findPlayerInOrganization(session.user.id, organizationId)
  if (!player) return null

  const playerWithTeam = await db.player.findUniqueOrThrow({
    where: { id: player.id },
    include: {
      team: true,
      person: { select: { firstName: true, lastName: true, photoMimeType: true, photoData: true } },
    },
  })

  return {
    session,
    organizationId,
    player,
    playerWithTeam,
  }
}

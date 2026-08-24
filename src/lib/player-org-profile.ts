import { db } from '@/lib/db'

export async function findPlayerInOrganization(userId: string, organizationId: string) {
  return db.player.findFirst({
    where: {
      organizationId,
      person: { userId },
    },
  })
}

export async function findPlayerInOrganizationOrThrow(userId: string, organizationId: string) {
  const player = await findPlayerInOrganization(userId, organizationId)
  if (!player) {
    throw new Error('PlayerNotFoundInOrganization')
  }
  return player
}

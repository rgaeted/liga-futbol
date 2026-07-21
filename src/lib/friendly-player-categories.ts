import type { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'

type Tx = Prisma.TransactionClient

export async function createUserForFriendlyPlayer(
  tx: Tx,
  params: {
    firstName: string
    lastName: string
    email: string
    password: string
  }
): Promise<string> {
  const passwordHash = await bcrypt.hash(params.password, 10)
  const user = await tx.user.create({
    data: {
      email: params.email,
      passwordHash,
      name: `${params.firstName} ${params.lastName}`.trim(),
      role: Role.PLAYER,
    },
  })
  await tx.player.create({
    data: { userId: user.id },
  })
  return user.id
}

export async function syncFriendlyPlayerCategories(
  tx: Tx,
  friendlyPlayerId: string,
  friendlyCategoryIds: string[]
): Promise<void> {
  await tx.friendlyPlayerCategory.deleteMany({ where: { friendlyPlayerId } })
  if (friendlyCategoryIds.length === 0) return
  await tx.friendlyPlayerCategory.createMany({
    data: friendlyCategoryIds.map((friendlyCategoryId) => ({
      friendlyPlayerId,
      friendlyCategoryId,
    })),
  })
}

export function mapFriendlyPlayerCategoryIds(
  memberships: Array<{ friendlyCategoryId: string }>
): string[] {
  return memberships.map((m) => m.friendlyCategoryId)
}

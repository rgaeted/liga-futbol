import type { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { MembershipRole } from '@/lib/membership-role'

type Tx = Prisma.TransactionClient

export async function createUserForFriendlyPlayer(
  tx: Tx,
  params: {
    organizationId: string
    firstName: string
    lastName: string
    email: string
    password: string
  }
): Promise<{ userId: string; personId: string }> {
  const passwordHash = await bcrypt.hash(params.password, 10)
  const user = await tx.user.create({
    data: {
      email: params.email,
      passwordHash,
      name: `${params.firstName} ${params.lastName}`.trim(),
    },
  })
  await tx.organizationMembership.create({
    data: {
      organizationId: params.organizationId,
      userId: user.id,
      roles: [MembershipRole.PLAYER],
    },
  })
  const person = await tx.person.create({
    data: {
      userId: user.id,
      firstName: params.firstName,
      lastName: params.lastName,
    },
  })
  await tx.player.create({
    data: { personId: person.id, organizationId: params.organizationId },
  })
  return { userId: user.id, personId: person.id }
}

export async function syncPlayerCategories(
  tx: Tx,
  playerId: string,
  friendlyCategoryIds: string[]
): Promise<void> {
  await tx.playerCategory.deleteMany({ where: { playerId } })
  if (friendlyCategoryIds.length === 0) return
  await tx.playerCategory.createMany({
    data: friendlyCategoryIds.map((friendlyCategoryId) => ({
      playerId,
      friendlyCategoryId,
    })),
  })
}

export function mapPlayerCategoryIds(
  memberships: Array<{ friendlyCategoryId: string }>
): string[] {
  return memberships.map((m) => m.friendlyCategoryId)
}

export function mapPlayerResponse<
  T extends { person: { user: { id: string; email: string } | null } },
>(player: T) {
  return { ...player, user: player.person.user }
}

/** @deprecated use syncPlayerCategories */
export const syncFriendlyPlayerCategories = syncPlayerCategories

/** @deprecated use mapPlayerCategoryIds */
export const mapFriendlyPlayerCategoryIds = mapPlayerCategoryIds

/** @deprecated use mapPlayerResponse */
export const mapFriendlyPlayerResponse = mapPlayerResponse

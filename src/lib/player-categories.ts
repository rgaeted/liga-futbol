import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

export async function setPlayerCategories(
  playerId: string,
  categoryIds: string[],
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? db
  const run = async (inner: Prisma.TransactionClient) => {
    await inner.playerCategory.deleteMany({ where: { playerId } })
    if (categoryIds.length > 0) {
      await inner.playerCategory.createMany({
        data: categoryIds.map((friendlyCategoryId) => ({ playerId, friendlyCategoryId })),
        skipDuplicates: true,
      })
    }
  }
  if (tx) return run(tx)
  return db.$transaction(run)
}

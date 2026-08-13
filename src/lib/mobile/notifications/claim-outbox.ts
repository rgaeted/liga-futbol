import { NotificationOutboxStatus, type NotificationOutbox } from '@prisma/client'
import { db } from '@/lib/db'

export async function claimPendingOutbox(
  limit: number,
  now = new Date(),
): Promise<NotificationOutbox[]> {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "NotificationOutbox"
      WHERE (
        status = ${NotificationOutboxStatus.PENDING}::"NotificationOutboxStatus"
        OR (
          status = ${NotificationOutboxStatus.FAILED}::"NotificationOutboxStatus"
          AND attempts < 8
          AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= ${now})
        )
      )
      ORDER BY "createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `

    if (rows.length === 0) {
      return []
    }

    const ids = rows.map((row) => row.id)
    await tx.notificationOutbox.updateMany({
      where: { id: { in: ids } },
      data: { status: NotificationOutboxStatus.PROCESSING },
    })

    return tx.notificationOutbox.findMany({
      where: { id: { in: ids } },
    })
  })
}

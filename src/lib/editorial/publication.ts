import { EditorialStatus } from '@prisma/client'

export function applyPublishTransition(
  status: EditorialStatus,
  publishedAt: Date | null,
  now: Date,
): Date | null {
  if (status === EditorialStatus.PUBLISHED) {
    return publishedAt ?? now
  }
  return null
}

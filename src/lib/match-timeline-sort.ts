export type TimelineEventSortable = {
  minute: number
  createdAt: Date | string
}

export function sortTimelineEvents<T extends TimelineEventSortable>(
  events: T[],
  options?: { preferCreatedAt?: boolean }
): T[] {
  const preferCreatedAt = options?.preferCreatedAt ?? false

  return [...events].sort((a, b) => {
    const aTime = toTime(a.createdAt)
    const bTime = toTime(b.createdAt)

    if (preferCreatedAt) {
      return aTime - bTime
    }

    const minuteDiff = a.minute - b.minute
    if (minuteDiff !== 0) return minuteDiff
    return aTime - bTime
  })
}

function toTime(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

export function timelineUsesCreatedAtOrder(clockStartedAt: Date | string | null | undefined): boolean {
  return !clockStartedAt
}

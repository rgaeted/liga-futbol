import { z } from 'zod'

export const mobileMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  status: z.enum(['upcoming', 'results', 'all']).optional().default('all'),
})

export type MobileMatchesQuery = z.infer<typeof mobileMatchesQuerySchema>

export function parseMobileMatchesQuery(searchParams: URLSearchParams) {
  return mobileMatchesQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    cursor: searchParams.get('cursor') ?? undefined,
    status: searchParams.get('status') ?? undefined,
  })
}

export function decodeMatchCursor(cursor: string): { scheduledAt: Date; id: string } | null {
  const [iso, id] = cursor.split('|')
  if (!iso || !id) return null
  const scheduledAt = new Date(iso)
  if (Number.isNaN(scheduledAt.getTime())) return null
  return { scheduledAt, id }
}

export function encodeMatchCursor(scheduledAt: Date, id: string): string {
  return `${scheduledAt.toISOString()}|${id}`
}

import { z } from 'zod'

export const mobileEditorialQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
})

export type MobileEditorialQuery = z.infer<typeof mobileEditorialQuerySchema>

export function parseMobileEditorialQuery(searchParams: URLSearchParams) {
  return mobileEditorialQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    cursor: searchParams.get('cursor') ?? undefined,
  })
}

export function decodeEditorialCursor(
  cursor: string,
): { publishedAt: Date; id: string } | null {
  const [iso, id] = cursor.split('|')
  if (!iso || !id) return null
  const publishedAt = new Date(iso)
  if (Number.isNaN(publishedAt.getTime())) return null
  return { publishedAt, id }
}

export function encodeEditorialCursor(publishedAt: Date, id: string): string {
  return `${publishedAt.toISOString()}|${id}`
}

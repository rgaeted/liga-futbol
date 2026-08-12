import { NextResponse } from 'next/server'
import { mobileErrorResponse } from '@/lib/mobile/errors'
import { resolvePublishedLeagueBySlug } from '@/lib/mobile/league-context'

export const dynamic = 'force-dynamic'

export async function withPublishedLeague<T>(
  slug: string,
  handler: (
    league: NonNullable<Awaited<ReturnType<typeof resolvePublishedLeagueBySlug>>>,
  ) => Promise<T | Response>,
): Promise<Response> {
  try {
    const league = await resolvePublishedLeagueBySlug(slug)
    if (!league) {
      return NextResponse.json({ error: 'Edición no encontrada' }, { status: 404 })
    }
    const result = await handler(league)
    if (result instanceof Response) return result
    return NextResponse.json(result)
  } catch (error) {
    return mobileErrorResponse(error)
  }
}

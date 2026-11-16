import { NextResponse } from 'next/server'
import { MatchStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { requireMatchOrgRole } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { syncDefinitionsForMatch } from '@/lib/kelme-fixture/service'
import { revalidateOrgPublicLandingForMatch } from '@/lib/revalidate-org-public-pages'
import { publishMatchInvalidation } from '@/lib/supabase-realtime-server'

/** Reanuda un partido que se finalizó por error: vuelve a "en vivo" conservando marcador y reloj. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params

  let role: MembershipRole
  let session: Awaited<ReturnType<typeof requireMatchOrgRole>>['session']
  let match: Awaited<ReturnType<typeof requireMatchOrgRole>>['match']

  try {
    const authContext = await requireMatchOrgRole(matchId, [
      MembershipRole.REFEREE,
      MembershipRole.ORG_ADMIN,
    ])
    role = authContext.role
    session = authContext.session
    match = authContext.match
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    throw error
  }

  if (role === MembershipRole.REFEREE && match.refereeId !== session.user.id) {
    return NextResponse.json({ error: 'No eres el árbitro asignado' }, { status: 403 })
  }

  if (match.status !== MatchStatus.FINISHED) {
    return NextResponse.json({ error: 'Solo se puede reanudar un partido finalizado' }, { status: 400 })
  }

  const updated = await db.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.LIVE },
  })

  // El partido deja de contar como terminado: los cruces dependientes se recalculan.
  await syncDefinitionsForMatch(matchId)
  await publishMatchInvalidation(matchId)
  await revalidateOrgPublicLandingForMatch(matchId)

  return NextResponse.json({ match: updated })
}

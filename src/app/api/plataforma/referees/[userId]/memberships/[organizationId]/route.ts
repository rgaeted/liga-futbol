import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth'
import { mapPrismaError } from '@/lib/prisma-errors'
import { PlatformRefereeError, revokeRefereeMembership } from '@/lib/platform-referees'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string; organizationId: string }> }
) {
  try {
    await requirePlatformAdmin()
    const { userId, organizationId } = await params
    await revokeRefereeMembership(userId, organizationId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof PlatformRefereeError) {
      if (error.code === 'not_found') {
        return NextResponse.json({ error: 'No encontramos esa membresía.' }, { status: 404 })
      }
      if (error.code === 'not_referee') {
        return NextResponse.json(
          { error: 'Solo se puede quitar el acceso de árbitro en esa liga.' },
          { status: 409 }
        )
      }
      if (error.code === 'has_assigned_matches') {
        return NextResponse.json(
          {
            error:
              'Este árbitro tiene partidos programados o en curso en esa liga. Reasígnalos antes de quitar el acceso.',
          },
          { status: 409 }
        )
      }
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

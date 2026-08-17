import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth'
import { mapPrismaError } from '@/lib/prisma-errors'
import {
  PlatformOrgAdminError,
  revokeOrgAdminMembership,
} from '@/lib/platform-org-admins'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string; organizationId: string }> },
) {
  try {
    await requirePlatformAdmin()
    const { userId, organizationId } = await params
    await revokeOrgAdminMembership(userId, organizationId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof PlatformOrgAdminError) {
      if (error.code === 'not_found') {
        return NextResponse.json({ error: 'No encontramos esa membresía.' }, { status: 404 })
      }
      if (error.code === 'not_org_admin') {
        return NextResponse.json(
          { error: 'Solo se puede quitar el acceso de administrador de empresa.' },
          { status: 409 },
        )
      }
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

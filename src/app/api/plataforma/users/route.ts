import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth'
import { mapPrismaError } from '@/lib/prisma-errors'
import {
  PlatformOrgAdminError,
  grantOrgAdminAccess,
  listOrgAdmins,
} from '@/lib/platform-org-admins'
import { grantOrgAdminAccessSchema } from '@/lib/validations/platform-org-admin'

function mapPlatformOrgAdminError(error: PlatformOrgAdminError) {
  if (error.code === 'invalid_orgs') {
    return NextResponse.json(
      { error: 'Una o más empresas no existen o están pausadas.' },
      { status: 400 },
    )
  }
  if (error.code === 'password_required') {
    return NextResponse.json(
      { error: 'La contraseña es obligatoria para una cuenta nueva.' },
      { status: 400 },
    )
  }
  if (error.code === 'not_found') {
    return NextResponse.json({ error: 'No encontramos esa membresía.' }, { status: 404 })
  }
  if (error.code === 'not_org_admin') {
    return NextResponse.json(
      { error: 'Solo se puede quitar el acceso de administrador de empresa.' },
      { status: 409 },
    )
  }
  return NextResponse.json({ error: 'No pudimos completar la operación.' }, { status: 500 })
}

export async function GET() {
  try {
    await requirePlatformAdmin()
    const users = await listOrgAdmins()
    return NextResponse.json(users)
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    await requirePlatformAdmin()
    const parsed = grantOrgAdminAccessSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const result = await grantOrgAdminAccess(parsed.data)
    return NextResponse.json(result.user, { status: result.created ? 201 : 200 })
  } catch (error) {
    if (error instanceof PlatformOrgAdminError) {
      return mapPlatformOrgAdminError(error)
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

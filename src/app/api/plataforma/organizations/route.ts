import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth'
import { mapPrismaError } from '@/lib/prisma-errors'
import {
  OrganizationError,
  createOrganization,
  listOrganizations,
} from '@/lib/organizations'
import { createOrganizationSchema } from '@/lib/validations/organization'

function mapOrganizationError(error: OrganizationError) {
  if (error.code === 'reserved' || error.code === 'invalid') {
    return NextResponse.json({ error: 'Slug inválido o reservado' }, { status: 400 })
  }
  if (error.code === 'slug_taken' || error.code === 'admin_exists') {
    return NextResponse.json({ error: 'Conflicto al crear la empresa' }, { status: 409 })
  }
  if (error.code === 'admin_password_required') {
    return NextResponse.json(
      { error: 'La contraseña es obligatoria para una cuenta admin nueva.' },
      { status: 400 },
    )
  }
  return NextResponse.json({ error: 'Error al crear la empresa' }, { status: 500 })
}

export async function GET() {
  try {
    await requirePlatformAdmin()
    const organizations = await listOrganizations()
    return NextResponse.json(organizations)
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    await requirePlatformAdmin()
    const parsed = createOrganizationSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const result = await createOrganization(parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof OrganizationError) {
      return mapOrganizationError(error)
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

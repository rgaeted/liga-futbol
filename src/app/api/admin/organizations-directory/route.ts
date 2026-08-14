import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { serializeOrganizationDirectoryItem } from '@/lib/organizations-directory'

export async function GET() {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])

    const organizations = await db.organization.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: organizationId },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        logoStoragePath: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(organizations.map(serializeOrganizationDirectoryItem))
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    console.error('GET /api/admin/organizations-directory failed', error)
    return NextResponse.json({ error: 'Error al cargar organizaciones' }, { status: 500 })
  }
}

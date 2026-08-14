import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import { mapPrismaError } from '@/lib/prisma-errors'

export async function GET() {
  try {
    await requirePlatformAdmin()

    const users = await db.user.findMany({
      where: {
        OR: [
          { refereeProfile: { isNot: null } },
          { memberships: { some: { role: MembershipRole.REFEREE } } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        refereeProfile: {
          select: {
            phone: true,
            whatsapp: true,
            photoStoragePath: true,
          },
        },
        memberships: {
          where: { role: MembershipRole.REFEREE },
          select: {
            organization: { select: { id: true, slug: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(
      users.map((user) => ({
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.refereeProfile?.phone ?? null,
        whatsapp: user.refereeProfile?.whatsapp ?? null,
        photoUrl: editorialPublicUrl(user.refereeProfile?.photoStoragePath),
        organizations: user.memberships.map((m) => ({
          id: m.organization.id,
          slug: m.organization.slug,
          name: m.organization.name,
        })),
      })),
    )
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  getDashboardPath,
  MembershipRole,
  primaryMembershipRole,
} from '@/lib/membership-role'
import { orgCookieOptions } from '@/lib/org-cookie'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = (await req.json()) as { organizationId?: string }
  if (!body.organizationId) {
    return NextResponse.json({ error: 'organizationId requerido' }, { status: 400 })
  }

  const membership = await db.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: body.organizationId,
        userId: session.user.id,
      },
    },
    include: {
      organization: { select: { slug: true, status: true } },
    },
  })

  if (membership && membership.organization.status === 'ACTIVE') {
    const path = getDashboardPath(
      membership.organization.slug,
      primaryMembershipRole(membership.roles),
    )
    const response = NextResponse.json({ path })
    response.cookies.set(orgCookieOptions(membership.organizationId))
    return response
  }

  if (session.user.isPlatformAdmin) {
    const org = await db.organization.findUnique({
      where: { id: body.organizationId, status: 'ACTIVE' },
      select: { id: true, slug: true },
    })
    if (!org) {
      return NextResponse.json({ error: 'Sin acceso a esta empresa' }, { status: 403 })
    }

    const path = getDashboardPath(org.slug, MembershipRole.ORG_ADMIN)
    const response = NextResponse.json({ path })
    response.cookies.set(orgCookieOptions(org.id))
    return response
  }

  return NextResponse.json({ error: 'Sin acceso a esta empresa' }, { status: 403 })
}

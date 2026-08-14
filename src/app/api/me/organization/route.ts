import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getDashboardPath } from '@/lib/membership-role'
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

  if (!membership || membership.organization.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Sin acceso a esta empresa' }, { status: 403 })
  }

  const path = getDashboardPath(membership.organization.slug, membership.role)
  const response = NextResponse.json({ path })
  response.cookies.set(orgCookieOptions(membership.organizationId))
  return response
}

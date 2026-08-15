import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgCookieOptions } from '@/lib/org-cookie'
import {
  organizationSlugFromPath,
  resolvePostLoginDestination,
} from '@/lib/post-login-redirect'

function organizationIdForDestination(
  path: string,
  activeMemberships: Array<{ organizationId: string; organization: { slug: string } }>,
): string | null {
  const slug = organizationSlugFromPath(path)
  if (slug) {
    const match = activeMemberships.find((m) => m.organization.slug === slug)
    if (match) return match.organizationId
  }
  return activeMemberships.length === 1 ? activeMemberships[0].organizationId : null
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const url = new URL(req.url)
  const callbackUrl = url.searchParams.get('callbackUrl')
  const wantsRedirect =
    url.searchParams.get('redirect') === '1' || callbackUrl !== null

  const memberships = await db.organizationMembership.findMany({
    where: { userId: session.user.id },
    include: {
      organization: { select: { slug: true, status: true } },
    },
  })

  const activeMemberships = memberships.filter((m) => m.organization.status === 'ACTIVE')

  const path = resolvePostLoginDestination({
    isPlatformAdmin: session.user.isPlatformAdmin,
    memberships: activeMemberships.map((m) => ({
      slug: m.organization.slug,
      role: m.role,
      status: m.organization.status,
    })),
    callbackUrl,
  })

  const organizationId = organizationIdForDestination(path, activeMemberships)

  if (wantsRedirect) {
    const response = NextResponse.redirect(new URL(path, req.url))
    if (organizationId) {
      response.cookies.set(orgCookieOptions(organizationId))
    }
    return response
  }

  const response = NextResponse.json({ path })
  if (organizationId) {
    response.cookies.set(orgCookieOptions(organizationId))
  }
  return response
}

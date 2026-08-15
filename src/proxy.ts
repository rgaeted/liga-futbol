import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import authConfig from '@/lib/auth.config'
import { isDatabaseHealthRequest } from '@/lib/database-health'
import { decideMigrationRequest, isPublicRequest } from '@/lib/proxy-policy'
import { tenantDashboardArea } from '@/lib/proxy-tenant'
import { rewriteLegacyTenantPath } from '@/lib/tenant-paths'
import { canAccess, getDashboardPath } from '@/lib/membership-role'

const { auth } = NextAuth(authConfig)

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl
  const migrationDecision = decideMigrationRequest({
    method: req.method,
    pathname,
    maintenanceMode: process.env.MIGRATION_MAINTENANCE_MODE,
  })

  if (migrationDecision?.kind === 'json') {
    return NextResponse.json(migrationDecision.body, {
      status: migrationDecision.status,
    })
  }
  if (migrationDecision?.kind === 'redirect') {
    return NextResponse.redirect(new URL(migrationDecision.location, req.url))
  }

  const legacyTarget = rewriteLegacyTenantPath(pathname)
  if (legacyTarget) {
    const url = new URL(legacyTarget, req.url)
    url.search = search
    return NextResponse.redirect(url, 308)
  }

  if (
    isPublicRequest(req.method, pathname) ||
    isDatabaseHealthRequest(req.method, pathname)
  ) {
    return NextResponse.next()
  }

  if (!req.auth) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/plataforma') && !req.auth.user.isPlatformAdmin) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const tenantArea = tenantDashboardArea(pathname)
  if (tenantArea) {
    const { slug, area } = tenantArea
    const membershipRole = req.auth.user.membershipRole
    const activeSlug = req.auth.user.activeOrganizationSlug

    if (activeSlug && activeSlug !== slug) {
      return NextResponse.redirect(new URL('/organizaciones', req.url))
    }

    if (membershipRole && !canAccess(membershipRole, area)) {
      return NextResponse.redirect(new URL(getDashboardPath(slug, membershipRole), req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import authConfig from '@/lib/auth.config'
import { decideMigrationRequest, isPublicRequest } from '@/lib/proxy-policy'
import { canAccess, getDashboardPath, type Role } from '@/lib/roles'

const { auth } = NextAuth(authConfig)

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl
  const migrationDecision = decideMigrationRequest({
    method: req.method,
    pathname,
    search,
    maintenanceMode: process.env.MIGRATION_MAINTENANCE_MODE,
    redirectUrl: process.env.MIGRATION_REDIRECT_URL,
    requestOrigin: req.nextUrl.origin,
  })

  if (migrationDecision?.kind === 'json') {
    return NextResponse.json(migrationDecision.body, {
      status: migrationDecision.status,
    })
  }
  if (migrationDecision?.kind === 'redirect') {
    return NextResponse.redirect(new URL(migrationDecision.location, req.url))
  }
  if (isPublicRequest(req.method, pathname)) return NextResponse.next()

  if (!req.auth) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = req.auth.user.role as Role
  const area = pathname.split('/')[1] as 'admin' | 'player' | 'coach' | 'referee'
  if (['admin', 'player', 'coach', 'referee'].includes(area) && !canAccess(role, area)) {
    return NextResponse.redirect(new URL(getDashboardPath(role), req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

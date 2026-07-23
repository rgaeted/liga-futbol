import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import authConfig from '@/lib/auth.config'
import { canAccess, getDashboardPath, type Role } from '@/lib/roles'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPhotoGet =
    req.method === 'GET' && /^\/api\/friendly-players\/[^/]+\/photo$/.test(pathname)
  const isTeamCrestGet =
    req.method === 'GET' && /^\/api\/teams\/[^/]+\/crest$/.test(pathname)
  const isMatchCrestGet =
    req.method === 'GET' && /^\/api\/matches\/[^/]+\/crest\/[AB]$/.test(pathname)
  const isMatchMvpPhotoGet =
    req.method === 'GET' &&
    /^\/api\/matches\/[^/]+\/mvp\/(home|away)\/photo$/.test(pathname)
  const isFormationsGet =
    req.method === 'GET' && /^\/api\/matches\/[^/]+\/formations$/.test(pathname)
  const isClaimPost =
    req.method === 'POST' && pathname === '/api/friendly-players/claim'

  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/live') ||
    pathname.startsWith('/api/auth') ||
    isPhotoGet ||
    isMatchMvpPhotoGet ||
    isTeamCrestGet ||
    isMatchCrestGet ||
    isFormationsGet ||
    isClaimPost

  if (isPublic) return NextResponse.next()

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

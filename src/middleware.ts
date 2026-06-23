import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { canAccess, getDashboardPath } from '@/lib/roles'
import { Role } from '@prisma/client'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/live') ||
    pathname.startsWith('/api/auth')

  if (isPublic) return NextResponse.next()

  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
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

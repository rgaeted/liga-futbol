import { auth, signOutAndClearOrg } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MembershipRole, getDashboardPath } from '@/lib/membership-role'
import { orgPath } from '@/lib/tenant-paths'
import { findTenantMembership, canAccessTenantArea } from '@/lib/tenant-access'
import { AdminShell } from '@/components/admin/AdminShell'
import type { AdminNavItem } from '@/components/admin/AdminNav'

export const dynamic = 'force-dynamic'

export function buildAdminNav(slug: string): AdminNavItem[] {
  const base = (path: string) => orgPath(slug, path)
  return [
    { href: base('/admin'), label: 'Inicio' },
    { href: base('/admin/teams'), label: 'Equipos' },
    { href: base('/admin/players'), label: 'Jugadores' },
    { href: base('/admin/matches'), label: 'Partidos' },
    { href: base('/admin/challenges'), label: 'Desafíos', activePrefixes: [base('/admin/challenges')] },
    { href: base('/admin/seasons'), label: 'Temporadas' },
    {
      href: base('/admin/content'),
      label: 'Contenido',
      activePrefixes: [
        base('/admin/content'),
        base('/admin/content/articles'),
        base('/admin/content/galleries'),
        base('/admin/content/sponsors'),
      ],
    },
    {
      href: base('/admin/friendly-players'),
      label: 'Amistosos',
      activePrefixes: [base('/admin/friendly-players'), base('/admin/friendly-categories')],
    },
    { href: base('/admin/users'), label: 'Usuarios' },
    { href: base('/admin/referees'), label: 'Árbitros', activePrefixes: [base('/admin/referees')] },
  ]
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const session = await auth()
  const adminPath = orgPath(organizationSlug, '/admin')
  if (!session?.user?.id) redirect(`/login?callbackUrl=${adminPath}`)

  const membership = await findTenantMembership(session.user.id, organizationSlug)
  if (!membership || !canAccessTenantArea(membership.role, 'admin')) {
    if (membership) redirect(getDashboardPath(organizationSlug, membership.role))
    redirect('/organizaciones')
  }

  async function handleSignOut() {
    'use server'
    await signOutAndClearOrg('/login')
  }

  return (
    <AdminShell
      nav={buildAdminNav(organizationSlug)}
      userName={session.user.name ?? 'Admin'}
      signOutAction={handleSignOut}
    >
      {children}
    </AdminShell>
  )
}

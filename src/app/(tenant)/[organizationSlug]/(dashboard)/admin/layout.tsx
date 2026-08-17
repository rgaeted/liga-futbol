import { auth, signOutAndClearOrg } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MembershipRole, getDashboardPath } from '@/lib/membership-role'
import { orgPath } from '@/lib/tenant-paths'
import { findTenantMembership, canAccessTenantArea } from '@/lib/tenant-access'
import { AdminShell } from '@/components/admin/AdminShell'
import { SyncOrgCookie } from '@/components/tenant/SyncOrgCookie'
import type { DashboardNavGroup } from '@/components/dashboard/dashboard-ui'

export const dynamic = 'force-dynamic'

export function buildAdminNavGroups(slug: string): DashboardNavGroup[] {
  const base = (path: string) => orgPath(slug, path)
  return [
    {
      label: 'General',
      items: [{ href: base('/admin'), label: 'Resumen', icon: 'IN' }],
    },
    {
      label: 'Competición',
      items: [
        { href: base('/admin/teams'), label: 'Equipos', icon: 'EQ' },
        { href: base('/admin/players'), label: 'Jugadores', icon: 'JU' },
        { href: base('/admin/matches'), label: 'Partidos', icon: 'PA' },
        {
          href: base('/admin/friendly-players'),
          label: 'Amistosos',
          icon: 'AM',
          activePrefixes: [base('/admin/friendly-players'), base('/admin/friendly-categories')],
        },
        {
          href: base('/admin/referees'),
          label: 'Árbitros',
          icon: 'AR',
          activePrefixes: [base('/admin/referees')],
        },
      ],
    },
    {
      label: 'Liga',
      items: [
        { href: base('/admin/seasons'), label: 'Temporadas', icon: 'TE' },
        {
          href: base('/admin/challenges'),
          label: 'Desafíos',
          icon: 'DE',
          activePrefixes: [base('/admin/challenges')],
        },
        {
          href: base('/admin/content'),
          label: 'Contenido',
          icon: 'CO',
          activePrefixes: [
            base('/admin/content'),
            base('/admin/content/articles'),
            base('/admin/content/galleries'),
            base('/admin/content/sponsors'),
          ],
        },
      ],
    },
    {
      label: 'Administración',
      items: [{ href: base('/admin/users'), label: 'Usuarios', icon: 'US' }],
    },
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
      navGroups={buildAdminNavGroups(organizationSlug)}
      organizationSlug={organizationSlug}
      userName={session.user.name ?? 'Admin'}
      signOutAction={handleSignOut}
    >
      <SyncOrgCookie organizationId={membership.organizationId} />
      {children}
    </AdminShell>
  )
}

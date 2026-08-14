import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MembershipRole, getDashboardPath } from '@/lib/membership-role'
import { orgPath } from '@/lib/tenant-paths'
import { findTenantMembership, canAccessTenantArea } from '@/lib/tenant-access'
import { DashboardShell } from '@/components/kelme/DashboardShell'

function buildPlayerNav(slug: string) {
  return [
    { href: orgPath(slug, '/player'), label: 'Mi Panel' },
    { href: orgPath(slug, '/player/matches'), label: 'Mis Partidos' },
    { href: orgPath(slug, '/player/friendly-matches'), label: 'Amistosos (DT)' },
  ]
}

const friendlyCoachNav = (slug: string) => [
  { href: orgPath(slug, '/player/friendly-matches'), label: 'Amistosos (DT)' },
]

export default async function PlayerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const membership = await findTenantMembership(session.user.id, organizationSlug)
  if (!membership || !canAccessTenantArea(membership.role, 'player')) {
    if (membership) redirect(getDashboardPath(organizationSlug, membership.role))
    redirect('/organizaciones')
  }

  const nav =
    membership.role === MembershipRole.FRIENDLY_COACH
      ? friendlyCoachNav(organizationSlug)
      : buildPlayerNav(organizationSlug)

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <DashboardShell nav={nav} signOutAction={handleSignOut}>
      {children}
    </DashboardShell>
  )
}

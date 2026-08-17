import { auth, signOutAndClearOrg } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MembershipRole, getDashboardPath, membershipRoleLabel } from '@/lib/membership-role'
import { orgPath } from '@/lib/tenant-paths'
import { findTenantMembership, canAccessTenantArea } from '@/lib/tenant-access'
import { DashboardShell } from '@/components/kelme/DashboardShell'
import { SyncOrgCookie } from '@/components/tenant/SyncOrgCookie'
import { SyncTenantSession } from '@/components/tenant/SyncTenantSession'

export const dynamic = 'force-dynamic'

function buildPlayerNav(slug: string) {
  return [
    { href: orgPath(slug, '/player'), label: 'Mi panel', icon: 'IN' },
    { href: orgPath(slug, '/player/matches'), label: 'Mis partidos', icon: 'PA' },
    { href: orgPath(slug, '/player/friendly-matches'), label: 'Amistosos (DT)', icon: 'AM' },
  ]
}

const friendlyCoachNav = (slug: string) => [
  { href: orgPath(slug, '/player/friendly-matches'), label: 'Amistosos (DT)', icon: 'AM' },
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

  const isFriendlyCoach = membership.role === MembershipRole.FRIENDLY_COACH
  const nav = isFriendlyCoach ? friendlyCoachNav(organizationSlug) : buildPlayerNav(organizationSlug)
  const roleLabel = membershipRoleLabel(membership.role)

  async function handleSignOut() {
    'use server'
    await signOutAndClearOrg('/login')
  }

  return (
    <DashboardShell
      nav={nav}
      navGroupLabel={roleLabel}
      organizationName={membership.organization.name}
      userName={session.user.name ?? 'Jugador'}
      roleLabel={roleLabel}
      helpHref={orgPath(organizationSlug, '/ayuda')}
      signOutAction={handleSignOut}
    >
      <SyncOrgCookie organizationId={membership.organizationId} />
      <SyncTenantSession
        organizationId={membership.organizationId}
        organizationSlug={organizationSlug}
        role={membership.role}
      />
      {children}
    </DashboardShell>
  )
}

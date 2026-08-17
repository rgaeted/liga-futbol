import { auth, signOutAndClearOrg } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardPath } from '@/lib/membership-role'
import { orgPath } from '@/lib/tenant-paths'
import { findTenantMembership, canAccessTenantArea } from '@/lib/tenant-access'
import { DashboardShell } from '@/components/kelme/DashboardShell'
import { SyncOrgCookie } from '@/components/tenant/SyncOrgCookie'

function buildCoachNav(slug: string) {
  return [
    { href: orgPath(slug, '/coach'), label: 'Partidos', icon: 'PA' },
    { href: orgPath(slug, '/coach/evaluations'), label: 'Evaluaciones', icon: 'EV' },
  ]
}

export default async function CoachLayout({
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
  if (!membership || !canAccessTenantArea(membership.role, 'coach')) {
    if (membership) redirect(getDashboardPath(organizationSlug, membership.role))
    redirect('/organizaciones')
  }

  async function handleSignOut() {
    'use server'
    await signOutAndClearOrg('/login')
  }

  return (
    <DashboardShell
      nav={buildCoachNav(organizationSlug)}
      navGroupLabel="Directo técnico"
      userName={session.user.name ?? 'DT'}
      roleLabel="Director técnico"
      helpHref={orgPath(organizationSlug, '/ayuda')}
      signOutAction={handleSignOut}
    >
      <SyncOrgCookie organizationId={membership.organizationId} />
      {children}
    </DashboardShell>
  )
}

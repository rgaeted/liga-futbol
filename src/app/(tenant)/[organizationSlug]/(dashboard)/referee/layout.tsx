import { auth, signOutAndClearOrg } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardPath } from '@/lib/membership-role'
import { orgPath } from '@/lib/tenant-paths'
import { findTenantMembership, canAccessTenantArea } from '@/lib/tenant-access'
import { DashboardShell } from '@/components/kelme/DashboardShell'

function buildRefereeNav(slug: string) {
  return [{ href: orgPath(slug, '/referee'), label: 'Mis Partidos' }]
}

export default async function RefereeLayout({
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
  if (!membership || !canAccessTenantArea(membership.role, 'referee')) {
    if (membership) redirect(getDashboardPath(organizationSlug, membership.role))
    redirect('/organizaciones')
  }

  async function handleSignOut() {
    'use server'
    await signOutAndClearOrg('/login')
  }

  return (
    <DashboardShell nav={buildRefereeNav(organizationSlug)} signOutAction={handleSignOut}>
      {children}
    </DashboardShell>
  )
}

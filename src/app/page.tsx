import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProductLanding } from '@/components/marketing/ProductLanding'
import { resolvePostLoginPath } from '@/lib/post-login-redirect'
import type { BillingPlan } from '@/lib/billing/plans'

export default async function HomePage() {
  const session = await auth()
  if (!session?.user?.id) {
    return <ProductLanding />
  }

  const memberships = await db.organizationMembership.findMany({
    where: { userId: session.user.id },
    include: { organization: { select: { slug: true, status: true, plan: true } } },
  })

  const panelHref = resolvePostLoginPath({
    isPlatformAdmin: session.user.isPlatformAdmin,
    memberships: memberships.map((m) => ({
      slug: m.organization.slug,
      roles: m.roles,
      status: m.organization.status,
    })),
  })

  let currentPlan: BillingPlan | null = null
  const active = memberships.filter((m) => m.organization.status === 'ACTIVE')
  if (active.length === 1) {
    currentPlan = active[0].organization.plan
  }

  return (
    <ProductLanding isLoggedIn panelHref={panelHref} currentPlan={currentPlan} />
  )
}

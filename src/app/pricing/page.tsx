import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { PricingSection } from '@/components/billing/PricingSection'
import { MarketingShell } from '@/components/kelme/MarketingShell'
import { resolvePostLoginPath } from '@/lib/post-login-redirect'
import type { BillingPlan } from '@/lib/billing/plans'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const session = await auth()
  let panelHref: string | null = null
  let currentPlan: BillingPlan | null = null

  if (session?.user?.id) {
    const memberships = await db.organizationMembership.findMany({
      where: { userId: session.user.id },
      include: {
        organization: { select: { slug: true, status: true, plan: true } },
      },
    })

    panelHref = resolvePostLoginPath({
      isPlatformAdmin: session.user.isPlatformAdmin,
      memberships: memberships.map((m) => ({
        slug: m.organization.slug,
        roles: m.roles,
        status: m.organization.status,
      })),
    })

    const active = memberships.filter((m) => m.organization.status === 'ACTIVE')
    if (active.length === 1) {
      currentPlan = active[0].organization.plan
    }
  }

  return (
    <MarketingShell
      productName="LigaLab"
      active="pricing"
      panelHref={panelHref}
      showLogin={!session?.user?.id}
    >
      <main className="flex-1">
        <section className="border-b border-[#2A3A32] bg-[#121A18]">
          <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
            <Link href="/" className="text-sm font-bold text-[#8A938C] hover:text-[#E8E4D8]">
              ← Volver al inicio
            </Link>
            <h1 className="font-display mt-4 text-[clamp(2rem,4vw,3rem)] font-black uppercase leading-none tracking-wide text-[#E8E4D8]">
              Precios
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-[#8A938C]">
              Jugar no cuesta nada. Organizar equipos o ligas requiere activar Club o Liga.
            </p>
          </div>
        </section>
        <PricingSection isLoggedIn={Boolean(session?.user?.id)} currentPlan={currentPlan} />
      </main>
    </MarketingShell>
  )
}

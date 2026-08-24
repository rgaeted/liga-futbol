import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { resolvePrimaryDashboardPath } from '@/lib/membership-role'
import { redirect } from 'next/navigation'
import { OrganizationPicker } from '@/components/plataforma/OrganizationPicker'

export const dynamic = 'force-dynamic'

export default async function OrganizacionesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const memberships = await db.organizationMembership.findMany({
    where: { userId: session.user.id },
    include: {
      organization: { select: { id: true, name: true, slug: true, status: true } },
    },
    orderBy: { organization: { name: 'asc' } },
  })

  const active = memberships.filter((m) => m.organization.status === 'ACTIVE')

  if (active.length === 1) {
    redirect(resolvePrimaryDashboardPath(active[0].organization.slug, active[0].roles))
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B1210] px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-org-primary text-xl font-black text-[#E8E4D8]">
            LL
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-[#E8E4D8]">Elige una empresa</h1>
            <p className="mt-1 font-ui text-sm text-[#8A938C]">
              Tienes acceso a varias ligas. Elige una para entrar; puedes cambiar después desde el
              selector del panel.
            </p>
          </div>
        </div>
        <div className="card-kelme p-6">
          <OrganizationPicker
            memberships={active.map((m) => ({
              organizationId: m.organizationId,
              name: m.organization.name,
              slug: m.organization.slug,
              roles: m.roles,
            }))}
          />
        </div>
      </div>
    </main>
  )
}

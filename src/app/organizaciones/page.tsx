import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getDashboardPath } from '@/lib/membership-role'
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
    redirect(getDashboardPath(active[0].organization.slug, active[0].role))
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-zinc-900">Elige una empresa</h1>
          <p className="mt-1 font-ui text-sm text-zinc-600">
            Tienes acceso a varias organizaciones. Selecciona con cuál quieres trabajar.
          </p>
        </div>
        <OrganizationPicker
          memberships={active.map((m) => ({
            organizationId: m.organizationId,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role,
          }))}
        />
      </div>
    </main>
  )
}

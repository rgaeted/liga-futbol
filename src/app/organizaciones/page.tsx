import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  resolvePrimaryDashboardPath,
} from '@/lib/membership-role'
import { redirect } from 'next/navigation'
import { OrganizationPicker } from '@/components/plataforma/OrganizationPicker'
import { syncPlayerDerivedMemberships } from '@/lib/player-memberships'
import { listAccessibleMemberships } from '@/lib/tenant-access'

export const dynamic = 'force-dynamic'

export default async function OrganizacionesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await syncPlayerDerivedMemberships(session.user.id)

  const accessible = await listAccessibleMemberships(
    session.user.id,
    session.user.isPlatformAdmin,
  )

  if (accessible.length === 1) {
    redirect(resolvePrimaryDashboardPath(accessible[0].slug, accessible[0].roles))
  }

  if (accessible.length === 0) {
    redirect(session.user.isPlatformAdmin ? '/plataforma' : '/login?error=sin-acceso')
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
          <OrganizationPicker memberships={accessible} />
        </div>
      </div>
    </main>
  )
}

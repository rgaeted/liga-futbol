import { Suspense } from 'react'
import { AuthPanel } from '@/app/(auth)/login/AuthPanel'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const available = await db.player.findMany({
    where: { person: { userId: null } },
    orderBy: [{ person: { lastName: 'asc' } }, { person: { firstName: 'asc' } }],
    select: {
      id: true,
      primaryPosition: true,
      person: { select: { firstName: true, lastName: true } },
      categories: {
        include: { friendlyCategory: { select: { name: true } } },
      },
    },
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B1210] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-org-primary text-xl font-black text-[#E8E4D8]">
            LL
          </div>
          <div className="text-center">
            <span className="font-display text-2xl font-black tracking-[0.08em] text-[#E8E4D8]">
              LIGALAB
            </span>
            <p className="mt-0.5 text-[10px] font-extrabold tracking-[0.13em] text-[#8A938C]">
              GESTIÓN DEPORTIVA
            </p>
          </div>
        </div>
        <Suspense
          fallback={
            <div className="card-kelme p-8 text-center font-ui text-sm text-[#8A938C]">
              Cargando…
            </div>
          }
        >
          <AuthPanel
            available={available.map((p) => ({
              id: p.id,
              firstName: p.person.firstName,
              lastName: p.person.lastName,
              primaryPosition: p.primaryPosition,
              categoryName: p.categories.map((c) => c.friendlyCategory.name).join(', '),
            }))}
          />
        </Suspense>
      </div>
    </main>
  )
}

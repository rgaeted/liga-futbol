import { Suspense } from 'react'
import { AuthPanel } from '@/app/(auth)/login/AuthPanel'
import type { AvailablePlayer } from '@/app/(auth)/register/RegisterForm'
import { db } from '@/lib/db'
import { verifyPlayerClaimToken } from '@/lib/player-claim-token'
import { organizationSlugFromPath } from '@/lib/organization-slug'

export const dynamic = 'force-dynamic'

const playerSelect = {
  id: true,
  primaryPosition: true,
  person: { select: { firstName: true, lastName: true, userId: true } },
  categories: {
    include: { friendlyCategory: { select: { name: true } } },
  },
} as const

function mapPlayer(row: {
  id: string
  primaryPosition: string | null
  person: { firstName: string; lastName: string }
  categories: Array<{ friendlyCategory: { name: string } }>
}): AvailablePlayer {
  return {
    id: row.id,
    firstName: row.person.firstName,
    lastName: row.person.lastName,
    primaryPosition: row.primaryPosition,
    categoryName: row.categories.map((c) => c.friendlyCategory.name).join(', '),
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; player?: string; token?: string; org?: string; callbackUrl?: string }>
}) {
  const params = await searchParams
  const playerId = params.player ?? null
  const token = params.token ?? null
  const registerOrgSlug =
    params.org ?? organizationSlugFromPath(params.callbackUrl ?? null) ?? null

  let lockedPlayer: AvailablePlayer | null = null
  let claimToken: string | null = null
  let inviteInvalid = false

  if (playerId && token) {
    if (verifyPlayerClaimToken(playerId, token)) {
      const player = await db.player.findUnique({
        where: { id: playerId },
        select: playerSelect,
      })
      if (player && player.person.userId === null) {
        lockedPlayer = mapPlayer(player)
        claimToken = token
      } else {
        inviteInvalid = true
      }
    } else {
      inviteInvalid = true
    }
  }

  let available: AvailablePlayer[] = []
  let organizationName: string | null = null

  if (!lockedPlayer) {
    if (registerOrgSlug) {
      const org = await db.organization.findFirst({
        where: { slug: registerOrgSlug, status: 'ACTIVE' },
        select: { id: true, name: true },
      })
      if (org) {
        organizationName = org.name
        const rows = await db.player.findMany({
          where: { organizationId: org.id, person: { userId: null } },
          orderBy: [{ person: { lastName: 'asc' } }, { person: { firstName: 'asc' } }],
          select: playerSelect,
        })
        available = rows.map(mapPlayer)
      }
    } else {
      const rows = await db.player.findMany({
        where: { person: { userId: null } },
        orderBy: [{ person: { lastName: 'asc' } }, { person: { firstName: 'asc' } }],
        select: playerSelect,
      })
      available = rows.map(mapPlayer)
    }
  }

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
            available={available}
            organizationSlug={registerOrgSlug}
            organizationName={organizationName}
            lockedPlayer={lockedPlayer}
            claimToken={claimToken}
            inviteInvalid={inviteInvalid}
          />
        </Suspense>
      </div>
    </main>
  )
}

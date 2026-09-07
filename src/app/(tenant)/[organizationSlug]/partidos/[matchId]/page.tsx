import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  canShowFriendlyMatchLiveLink,
  getFriendlyMatchPage,
} from '@/lib/friendly-match-page'
import { MatchAttendanceBoard } from '@/components/match-attendance/MatchAttendanceBoard'
import { findPlayerInOrganization } from '@/lib/player-org-profile'
import { friendlyMatchPublicPath } from '@/lib/match-attendance'
import { matchStatusLabel } from '@/lib/match-status-ui'

export const dynamic = 'force-dynamic'

export default async function FriendlyMatchPage({
  params,
}: {
  params: Promise<{ organizationSlug: string; matchId: string }>
}) {
  const { organizationSlug, matchId } = await params
  const data = await getFriendlyMatchPage(organizationSlug, matchId)
  if (!data) notFound()

  const session = await auth()
  const loginHref = `/login?callbackUrl=${friendlyMatchPublicPath(organizationSlug, matchId)}`
  let viewer = {
    signedIn: false,
    canSign: false,
    myPlayerId: null as string | null,
    loginHref,
  }
  if (session?.user?.id) {
    const org = await db.organization.findUnique({
      where: { slug: organizationSlug },
      select: { id: true },
    })
    if (org) {
      const player = await findPlayerInOrganization(session.user.id, org.id)
      viewer = {
        signedIn: true,
        canSign: Boolean(player),
        myPlayerId: player?.id ?? null,
        loginHref,
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0d0c] text-[#f4f5f2]">
      <div className="mx-auto w-[min(720px,calc(100%-32px))] py-10">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-org-primary">
          {data.dateLine} · {data.time}
        </p>
        <h1 className="mt-2 font-display text-[34px] font-semibold uppercase tracking-[-0.04em]">
          {data.sidesReady ? `${data.home} vs ${data.away}` : 'El partido se juega.'}
        </h1>
        <p className="mt-2 text-sm text-[#9ca59f]">
          {data.venue} · {matchStatusLabel(data.status)}
        </p>
        {canShowFriendlyMatchLiveLink(data.status) ? (
          <Link
            href={`/${organizationSlug}/live/${data.matchId}`}
            className="btn-kelme mt-4 inline-flex"
          >
            Ver en vivo
          </Link>
        ) : null}
        <div className="mt-10">
          <MatchAttendanceBoard
            matchId={data.matchId}
            open={data.open}
            attendees={data.attendees}
            viewer={viewer}
            matchLabel={data.sidesReady ? `${data.home} vs ${data.away}` : undefined}
            dateLine={`${data.dateLine} · ${data.time}`}
          />
        </div>
      </div>
    </main>
  )
}

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { MatchType } from '@prisma/client'
import { friendlyCoachSideForUser } from '@/lib/friendly-match-coach'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { footballFormatLabel } from '@/lib/football-format'
import { FriendlyLineupEditor } from '@/components/admin/FriendlyLineupEditor'
import { requireOrganizationId } from '@/lib/tenant-access'
import { orgPath } from '@/lib/tenant-paths'
import { playerDisplayName, PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'

export const dynamic = 'force-dynamic'

export default async function PlayerFriendlyLineupPage({
  params,
}: {
  params: Promise<{ organizationSlug: string; matchId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { organizationSlug, matchId } = await params

  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    redirect('/login')
  }

  const coachSide = await friendlyCoachSideForUser(session.user.id, matchId, organizationId)
  if (!coachSide) redirect(orgPath(organizationSlug, '/player/friendly-matches'))

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      formations: true,
      friendlyPlayers: {
        include: {
          player: { include: PLAYER_PERSON_NAME_INCLUDE },
        },
      },
    },
  })

  if (!match || match.matchType !== MatchType.FRIENDLY) notFound()

  const labelInput = {
    matchType: match.matchType,
    sideAName: match.sideAName,
    sideBName: match.sideBName,
    homeTeam: null,
    awayTeam: null,
  }
  const sides = matchSideNames(labelInput)
  const teamLabel = coachSide === 'A' ? sides.home : sides.away

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={orgPath(organizationSlug, '/player/friendly-matches')}
          className="text-sm text-kelme-red hover:underline"
        >
          ← Amistosos como DT
        </Link>
        <h1 className="font-display text-2xl font-bold">Formación — {teamLabel}</h1>
        <span className="rounded-full bg-kelme-gray-100 px-3 py-1 text-xs font-medium">
          {footballFormatLabel(match.footballFormat)}
        </span>
      </div>
      <p className="text-sm text-kelme-gray-600">
        {matchDisplayName(labelInput)} · Solo puedes modificar la formación de tu equipo.
      </p>

      <FriendlyLineupEditor
        matchId={match.id}
        footballFormat={match.footballFormat}
        homeLabel={sides.home}
        awayLabel={sides.away}
        formations={match.formations}
        editableSide={coachSide}
        participations={match.friendlyPlayers.map((p) => ({
          id: p.playerId,
          side: p.side,
          label: playerDisplayName(p.player),
          slotKey: p.slotKey,
          hasPhoto: Boolean(p.player.person.photoMimeType),
          primaryPosition: p.player.primaryPosition,
          secondaryPosition: p.player.secondaryPosition,
        }))}
      />
    </div>
  )
}

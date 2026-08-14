import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { MatchType } from '@prisma/client'
import { friendlyCoachSideForUser } from '@/lib/friendly-match-coach'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { footballFormatLabel } from '@/lib/football-format'
import { FriendlyLineupEditor } from '@/components/admin/FriendlyLineupEditor'

export default async function PlayerFriendlyLineupPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { matchId } = await params
  const coachSide = await friendlyCoachSideForUser(session.user.id, matchId)
  if (!coachSide) redirect('/player/friendly-matches')

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      formations: true,
      friendlyPlayers: { include: { friendlyPlayer: true } },
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
          href="/player/friendly-matches"
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
          id: p.friendlyPlayerId,
          side: p.side,
          label: `${p.friendlyPlayer.firstName} ${p.friendlyPlayer.lastName}`.trim(),
          slotKey: p.slotKey,
          hasPhoto: Boolean(p.friendlyPlayer.photoMimeType),
          primaryPosition: p.friendlyPlayer.primaryPosition,
          secondaryPosition: p.friendlyPlayer.secondaryPosition,
        }))}
      />
    </div>
  )
}

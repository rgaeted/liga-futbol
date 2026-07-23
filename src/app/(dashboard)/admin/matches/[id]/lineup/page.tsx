import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { MatchType } from '@prisma/client'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { footballFormatLabel } from '@/lib/football-format'
import { FriendlyLineupEditor } from '@/components/admin/FriendlyLineupEditor'
import { LeagueLineupEditor } from '@/components/admin/LeagueLineupEditor'
import Link from 'next/link'

function slotsFromCallUps(
  callUps: Array<{ playerId: string; slotKey: string | null }>
): Record<string, string> {
  const slots: Record<string, string> = {}
  for (const c of callUps) {
    if (c.slotKey) slots[c.slotKey] = c.playerId
  }
  return slots
}

export default async function AdminMatchLineupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const match = await db.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      formations: true,
      callUps: {
        include: { player: { include: { user: { select: { name: true } } } } },
      },
      friendlyPlayers: { include: { friendlyPlayer: true } },
    },
  })
  if (!match) notFound()

  const title = matchDisplayName(match)
  const sides = matchSideNames(match)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/matches" className="text-sm text-kelme-red hover:underline">
          ← Partidos
        </Link>
        <h1 className="font-display text-2xl font-bold">Formación — {title}</h1>
        <span className="rounded-full bg-kelme-gray-100 px-3 py-1 text-xs font-medium">
          {footballFormatLabel(match.footballFormat)}
        </span>
      </div>

      {match.matchType === MatchType.FRIENDLY ? (
        <FriendlyLineupEditor
          matchId={match.id}
          footballFormat={match.footballFormat}
          homeLabel={sides.home}
          awayLabel={sides.away}
          formations={match.formations}
          participations={match.friendlyPlayers.map((p) => ({
            id: p.friendlyPlayerId,
            side: p.side,
            label: `${p.friendlyPlayer.firstName} ${p.friendlyPlayer.lastName}`.trim(),
            slotKey: p.slotKey,
            hasPhoto: Boolean(p.friendlyPlayer.photoMimeType),
          }))}
        />
      ) : (
        <div className="space-y-10">
          {match.homeTeamId && match.homeTeam && (
            <LeagueLineupEditor
              matchId={match.id}
              teamId={match.homeTeamId}
              footballFormat={match.footballFormat}
              label={sides.home}
              initialScheme={
                match.formations.find((f) => f.teamId === match.homeTeamId)?.scheme ?? '4-3-3'
              }
              initialSlots={slotsFromCallUps(
                match.callUps.filter((c) => c.player.teamId === match.homeTeamId)
              )}
              players={match.callUps
                .filter((c) => c.player.teamId === match.homeTeamId)
                .map((c) => ({
                  id: c.playerId,
                  label: `#${c.player.jerseyNumber ?? '—'} ${c.player.user.name}`,
                }))}
            />
          )}
          {match.awayTeamId && match.awayTeam && (
            <LeagueLineupEditor
              matchId={match.id}
              teamId={match.awayTeamId}
              footballFormat={match.footballFormat}
              label={sides.away}
              initialScheme={
                match.formations.find((f) => f.teamId === match.awayTeamId)?.scheme ?? '4-3-3'
              }
              initialSlots={slotsFromCallUps(
                match.callUps.filter((c) => c.player.teamId === match.awayTeamId)
              )}
              players={match.callUps
                .filter((c) => c.player.teamId === match.awayTeamId)
                .map((c) => ({
                  id: c.playerId,
                  label: `#${c.player.jerseyNumber ?? '—'} ${c.player.user.name}`,
                }))}
            />
          )}
        </div>
      )}
    </div>
  )
}

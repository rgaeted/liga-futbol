import { db } from '@/lib/db'
import { MatchForm } from '@/components/admin/MatchForm'
import { FriendlyMatchForm } from '@/components/admin/FriendlyMatchForm'
import { FriendlyPaidToggle } from '@/components/admin/FriendlyPaidToggle'
import { MatchActions } from '@/components/admin/MatchActions'
import { matchDisplayName } from '@/lib/match-label'
import { APP_LOCALE } from '@/lib/locale'
import Link from 'next/link'
import { MatchType, Role } from '@prisma/client'

export default async function AdminMatchesPage() {
  const [matches, seasons, teams, referees, friendlyPlayers] = await Promise.all([
    db.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: { select: { name: true } },
        season: true,
        friendlyPlayers: { include: { friendlyPlayer: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    }),
    db.season.findMany({ orderBy: { startDate: 'desc' } }),
    db.team.findMany({ orderBy: { name: 'asc' } }),
    db.user.findMany({
      where: { role: Role.REFEREE },
      select: { id: true, name: true },
    }),
    db.friendlyPlayer.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, primaryPosition: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Partidos</h1>
      <MatchForm seasons={seasons} teams={teams} referees={referees} />
      <FriendlyMatchForm referees={referees} friendlyPlayers={friendlyPlayers} />
      <div className="space-y-3">
        {matches.map((match) => {
          const title = matchDisplayName(match)
          const seasonLine =
            match.matchType === MatchType.FRIENDLY || !match.season
              ? 'Amistoso'
              : match.season.name

          return (
            <div
              key={match.id}
              className="rounded-xl border border-kelme-border bg-kelme-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{title}</p>
                    {match.matchType === MatchType.FRIENDLY && (
                      <span className="rounded-full bg-kelme-gray-100 px-2 py-0.5 text-xs font-medium">
                        Amistoso
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-kelme-gray-400">
                    {seasonLine} · {match.scheduledAt.toLocaleString(APP_LOCALE)}
                    {match.referee ? ` · ${match.referee.name}` : ''}
                  </p>
                  {match.matchType === MatchType.FRIENDLY &&
                    match.friendlyPlayers.length > 0 && (
                      <ul className="mt-3 space-y-2 border-t border-kelme-border pt-3">
                        {match.friendlyPlayers.map((part) => {
                          const fp = part.friendlyPlayer
                          const label = `${fp.firstName} ${fp.lastName}`.trim()
                          const sideLabel = part.side === 'A' ? 'A' : 'B'
                          return (
                            <li key={part.id}>
                              <FriendlyPaidToggle
                                matchId={match.id}
                                participationId={part.id}
                                initialPaid={part.paid}
                                playerLabel={`${label} (lado ${sideLabel})`}
                              />
                            </li>
                          )
                        })}
                      </ul>
                    )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg">
                    {match.homeScore} - {match.awayScore}
                  </span>
                  <span className="rounded-full bg-kelme-gray-100 px-3 py-1 text-xs">
                    {match.status}
                  </span>
                  <Link
                    href={`/live/${match.id}`}
                    className="text-sm text-kelme-red hover:underline"
                  >
                    Ver en vivo
                  </Link>
                  <MatchActions
                    match={{
                      id: match.id,
                      label: title,
                      refereeId: match.refereeId,
                      venue: match.venue,
                      status: match.status,
                      date: match.scheduledAt.toISOString().slice(0, 10),
                      time: match.scheduledAt.toISOString().slice(11, 16),
                    }}
                    referees={referees}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
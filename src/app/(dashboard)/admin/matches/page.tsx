import { db } from '@/lib/db'
import { MatchForm } from '@/components/admin/MatchForm'
import { FriendlyMatchForm } from '@/components/admin/FriendlyMatchForm'
import { FriendlyPaidToggle } from '@/components/admin/FriendlyPaidToggle'
import { MatchActions } from '@/components/admin/MatchActions'
import { matchDisplayName } from '@/lib/match-label'
import { footballFormatLabel } from '@/lib/football-format'
import { APP_LOCALE } from '@/lib/locale'
import { formatScheduleDateInput, formatScheduleTimeInput } from '@/lib/schedule-datetime'
import Link from 'next/link'
import { MatchType, Role } from '@prisma/client'
import { matchSideHasCrest } from '@/lib/match-side-crest'

export default async function AdminMatchesPage() {
  const [matches, seasons, teams, referees, friendlyCategories, friendlyPlayers] = await Promise.all([
    db.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: { select: { name: true } },
        season: true,
        friendlyCategory: { select: { id: true, name: true } },
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
    db.friendlyCategory.findMany({ orderBy: { name: 'asc' } }),
    db.friendlyPlayer.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryPosition: true,
        photoMimeType: true,
        categories: { select: { friendlyCategoryId: true } },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Partidos</h1>
      <MatchForm
        seasons={seasons.map((s) => ({
          id: s.id,
          name: s.name,
          footballFormat: s.footballFormat,
        }))}
        teams={teams}
        referees={referees}
      />
      <FriendlyMatchForm
        referees={referees}
        categories={friendlyCategories.map((c) => ({
          id: c.id,
          name: c.name,
          isActive: c.isActive,
        }))}
        friendlyPlayers={friendlyPlayers.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          categoryIds: p.categories.map((c) => c.friendlyCategoryId),
          primaryPosition: p.primaryPosition,
          hasPhoto: Boolean(p.photoMimeType),
        }))}
      />
      <div className="space-y-3">
        {matches.map((match) => {
          const title = matchDisplayName(match)
          const seasonLine =
            match.matchType === MatchType.FRIENDLY
              ? match.friendlyCategory?.name ?? 'Amistoso'
              : match.season?.name ?? 'Liga'

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
                    {seasonLine} · {footballFormatLabel(match.footballFormat)} ·{' '}
                    {match.scheduledAt.toLocaleString(APP_LOCALE)}
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
                <div className="flex flex-wrap items-center gap-3">
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
                  <Link
                    href={`/admin/matches/${match.id}/timeline`}
                    className="text-sm text-kelme-gray-600 hover:underline"
                  >
                    Cronología
                  </Link>
                  <Link
                    href={`/admin/matches/${match.id}/lineup`}
                    className="text-sm text-kelme-gray-600 hover:underline"
                  >
                    Formación
                  </Link>
                </div>
                <div className="w-full">
                  <MatchActions
                    match={{
                      id: match.id,
                      label: title,
                      matchType: match.matchType,
                      sideAName: match.sideAName,
                      sideBName: match.sideBName,
                      sideAColor: match.sideAColor,
                      sideBColor: match.sideBColor,
                      friendlyCategoryId: match.friendlyCategoryId,
                      playerSides: match.friendlyPlayers.map((p) => ({
                        friendlyPlayerId: p.friendlyPlayerId,
                        side: p.side,
                      })),
                      hasCrestA: matchSideHasCrest(match, 'A'),
                      hasCrestB: matchSideHasCrest(match, 'B'),
                      refereeId: match.refereeId,
                      venue: match.venue,
                      status: match.status,
                      footballFormat: match.footballFormat,
                      date: formatScheduleDateInput(match.scheduledAt),
                      time: formatScheduleTimeInput(match.scheduledAt),
                    }}
                    referees={referees}
                    friendlyPlayers={friendlyPlayers.map((p) => ({
                      id: p.id,
                      firstName: p.firstName,
                      lastName: p.lastName,
                      categoryIds: p.categories.map((c) => c.friendlyCategoryId),
                      primaryPosition: p.primaryPosition,
                      hasPhoto: Boolean(p.photoMimeType),
                    }))}
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
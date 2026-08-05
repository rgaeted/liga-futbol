import { db } from '@/lib/db'
import { MatchForm } from '@/components/admin/MatchForm'
import { FriendlyMatchForm } from '@/components/admin/FriendlyMatchForm'
import { AdminMatchCard } from '@/components/admin/AdminMatchCard'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { formatScheduleDateInput, formatScheduleTimeInput } from '@/lib/schedule-datetime'
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

  const rosterPlayers = friendlyPlayers.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    categoryIds: p.categories.map((c) => c.friendlyCategoryId),
    primaryPosition: p.primaryPosition,
    hasPhoto: Boolean(p.photoMimeType),
  }))

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
        friendlyPlayers={rosterPlayers}
      />
      <div className="space-y-4">
        {matches.map((match) => {
          const title = matchDisplayName(match)
          const sides = matchSideNames(match)
          const typeBadge =
            match.matchType === MatchType.FRIENDLY
              ? match.friendlyCategory?.name ?? 'Amistoso'
              : match.season?.name ?? 'Liga'

          const friendlyPlayerRows =
            match.matchType === MatchType.FRIENDLY
              ? match.friendlyPlayers.map((part) => {
                  const fp = part.friendlyPlayer
                  return {
                    participationId: part.id,
                    side: part.side,
                    label: `${fp.firstName} ${fp.lastName}`.trim(),
                    paid: part.paid,
                    isCaptain: part.isCaptain,
                    isCoach: part.isCoach,
                  }
                })
              : []

          return (
            <AdminMatchCard
              key={match.id}
              title={title}
              matchType={match.matchType}
              typeBadge={typeBadge}
              scheduledAt={match.scheduledAt}
              refereeName={match.referee?.name ?? null}
              footballFormat={match.footballFormat}
              homeScore={match.homeScore}
              awayScore={match.awayScore}
              status={match.status}
              sideAName={sides.home}
              sideBName={sides.away}
              friendlyPlayers={friendlyPlayerRows}
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
                  isCaptain: p.isCaptain,
                  isCoach: p.isCoach,
                })),
                hasCrestA: matchSideHasCrest(match, 'A'),
                hasCrestB: matchSideHasCrest(match, 'B'),
                refereeId: match.refereeId,
                venue: match.venue,
                regionCode: match.regionCode,
                regionName: match.regionName,
                communeCode: match.communeCode,
                communeName: match.communeName,
                communeLat: match.communeLat,
                weatherTempC: match.weatherTempC,
                weatherHumidityPct: match.weatherHumidityPct,
                weatherWindKmh: match.weatherWindKmh,
                weatherLabel: match.weatherLabel,
                weatherFetchedAt: match.weatherFetchedAt?.toISOString() ?? null,
                status: match.status,
                footballFormat: match.footballFormat,
                refereeEventTypes: match.refereeEventTypes,
                date: formatScheduleDateInput(match.scheduledAt),
                time: formatScheduleTimeInput(match.scheduledAt),
              }}
              referees={referees}
              rosterPlayers={rosterPlayers}
            />
          )
        })}
      </div>
    </div>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { orgPath } from '@/lib/tenant-paths'
import { MembershipRole } from '@/lib/membership-role'
import { requireOrganizationId } from '@/lib/tenant-access'
import { AdminMatchCard } from '@/components/admin/AdminMatchCard'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { formatScheduleDateInput, formatScheduleTimeInput } from '@/lib/schedule-datetime'
import { ChallengeStatus, MatchType } from '@prisma/client'
import { matchSideHasCrest } from '@/lib/match-side-crest'

export default async function AdminMatchesPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const [matches, refereeMemberships, friendlyPlayers] = await Promise.all([
    db.match.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                organizationId,
                NOT: {
                  challengeStatus: {
                    in: [ChallengeStatus.DECLINED, ChallengeStatus.CANCELLED],
                  },
                },
              },
              {
                guestOrganizationId: organizationId,
                challengeStatus: {
                  in: [ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED],
                },
              },
            ],
          },
        ],
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: { select: { name: true } },
        season: true,
        friendlyCategory: { select: { id: true, name: true } },
        guestOrganization: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } },
        friendlyPlayers: {
          include: {
            friendlyPlayer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    }),
    db.organizationMembership.findMany({
      where: { organizationId, role: MembershipRole.REFEREE },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: 'asc' } },
    }),
    db.friendlyPlayer.findMany({
      where: { organizationId },
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

  const referees = refereeMemberships.map((m) => m.user)

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Partidos</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={orgPath(organizationSlug, '/admin/matches/new')}
            className="inline-flex items-center justify-center rounded-xl bg-kelme-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-kelme-red-dark"
          >
            Crear partido
          </Link>
          <Link
            href={orgPath(organizationSlug, '/admin/matches/new/friendly')}
            className="inline-flex items-center justify-center rounded-xl border border-kelme-border bg-white px-4 py-2.5 text-sm font-semibold text-kelme-gray-800 hover:bg-kelme-gray-50"
          >
            Crear amistoso
          </Link>
        </div>
      </div>
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
                    isGalleta: part.isGalleta,
                    isCaptain: part.isCaptain,
                    isCoach: part.isCoach,
                  }
                })
              : []

          const challengeHint =
            match.challengeStatus === ChallengeStatus.PENDING
              ? match.organizationId === organizationId
                ? `Esperando a ${match.guestOrganization?.name ?? match.sideBName ?? 'visitante'}`
                : `Esperando tu respuesta — ${match.organization.name}`
              : null

          return (
            <AdminMatchCard
              key={match.id}
              title={title}
              matchType={match.matchType}
              typeBadge={typeBadge}
              challengeHint={challengeHint}
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

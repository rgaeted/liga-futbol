import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { slugFromSeasonName } from '@/lib/validations/mobile-season'
import { orgPath } from '@/lib/tenant-paths'
import { requireOrganizationId } from '@/lib/tenant-access'
import { SeasonMobilePageClient } from '@/components/admin/season-mobile/SeasonRosterEditor'
import { playerDisplayName, PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'

export default async function SeasonMobileAdminPage({
  params,
}: {
  params: Promise<{ organizationSlug: string; id: string }>
}) {
  const { organizationSlug, id } = await params
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const season = await db.season.findUnique({ where: { id } })
  if (!season || season.organizationId !== organizationId) notFound()

  const [config, teamsRaw, seasonTeams] = await Promise.all([
    db.seasonMobileConfig.findUnique({ where: { seasonId: id } }),
    db.team.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: {
        players: {
          include: PLAYER_PERSON_NAME_INCLUDE,
          orderBy: { jerseyNumber: 'asc' },
        },
      },
    }),
    db.seasonTeam.findMany({
      where: { seasonId: id },
      include: {
        rosterEntries: { where: { status: 'ACTIVE' }, select: { playerId: true } },
      },
    }),
  ])

  const enrolledByTeamId = new Map(
    seasonTeams.map((st) => [st.teamId, st.rosterEntries.map((e) => e.playerId)]),
  )

  return (
    <div className="space-y-4">
      <Link href={orgPath(organizationSlug, '/admin/seasons')} className="text-sm text-kelme-red hover:underline">
        ← Volver a temporadas
      </Link>
      <SeasonMobilePageClient
        seasonId={season.id}
        seasonName={season.name}
        organizationSlug={organizationSlug}
        slugLocked={config !== null}
        config={
          config
            ? {
                slug: config.slug,
                displayName: config.displayName,
                shortName: config.shortName,
                description: config.description,
                primaryColor: config.primaryColor,
                secondaryColor: config.secondaryColor,
                isPublished: config.isPublished,
              }
            : {
                slug: slugFromSeasonName(season.name),
                displayName: season.name,
                shortName: null,
                description: null,
                primaryColor: '#CD212A',
                secondaryColor: '#FFFFFF',
                isPublished: false,
              }
        }
        teams={teamsRaw.map((team) => ({
          teamId: team.id,
          name: team.name,
          color: team.color,
          players: team.players.map((p) => ({
            id: p.id,
            name: playerDisplayName(p),
            jerseyNumber: p.jerseyNumber,
            position: p.position,
          })),
          selectedPlayerIds: enrolledByTeamId.get(team.id) ?? [],
        }))}
      />
    </div>
  )
}

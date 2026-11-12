import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { requireOrganizationId } from '@/lib/tenant-access'
import { TeamForm } from '@/components/admin/TeamForm'
import { TeamsTable } from '@/components/admin/TeamsTable'
import { teamHasCrest } from '@/lib/team-crest'

export default async function AdminTeamsPage({
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

  const [teams, coachMemberships, categories] = await Promise.all([
    db.team.findMany({
      where: { organizationId },
      include: { category: { select: { name: true } }, coach: true, _count: { select: { players: true } } },
      orderBy: { name: 'asc' },
    }),
    db.organizationMembership.findMany({
      where: { organizationId, roles: { has: MembershipRole.COACH } },
      include: {
        user: {
          select: { id: true, name: true, coachedTeam: { select: { id: true } } },
        },
      },
      orderBy: { user: { name: 'asc' } },
    }),
    db.friendlyCategory.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const coaches = coachMemberships.map((m) => m.user)

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Equipos</h1>
      <p className="text-sm text-kelme-gray-400">
        Elige el color de cada equipo al editarlo; si no subes imagen, se genera un escudo automático con ese color.
      </p>
      <TeamForm categories={categories} />
      <TeamsTable
        categories={categories}
        teams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          categoryId: t.categoryId,
          categoryName: t.category?.name ?? null,
          coachId: t.coachId,
          coachName: t.coach?.name ?? null,
          playerCount: t._count.players,
          hasCrest: teamHasCrest(t),
          crestVersion: t.updatedAt.getTime(),
        }))}
        coaches={coaches.map((c) => ({
          id: c.id,
          name: c.name,
          assignedTeamId: c.coachedTeam?.id ?? null,
        }))}
      />
    </div>
  )
}

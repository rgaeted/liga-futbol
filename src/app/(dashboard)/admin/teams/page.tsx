import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { TeamForm } from '@/components/admin/TeamForm'
import { TeamsTable } from '@/components/admin/TeamsTable'
import { teamHasCrest } from '@/lib/team-crest'

export default async function AdminTeamsPage() {
  const [teams, coaches] = await Promise.all([
    db.team.findMany({
      include: { coach: true, _count: { select: { players: true } } },
      orderBy: { name: 'asc' },
    }),
    db.user.findMany({
      where: { role: Role.COACH },
      select: { id: true, name: true, coachedTeam: { select: { id: true } } },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Equipos</h1>
      <p className="text-sm text-kelme-gray-400">
        Sube el escudo de cada equipo al editarlo (JPG, PNG o WebP, máx. 500 KB).
      </p>
      <TeamForm />
      <TeamsTable
        teams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          coachId: t.coachId,
          coachName: t.coach?.name ?? null,
          playerCount: t._count.players,
          hasCrest: teamHasCrest(t),
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

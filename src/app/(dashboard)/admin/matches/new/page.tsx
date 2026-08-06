import { db } from '@/lib/db'
import { LeagueMatchCreateWizard } from '@/components/admin/match-create/LeagueMatchCreateWizard'
import { Role } from '@prisma/client'

export default async function NewLeagueMatchPage() {
  const [seasons, teams, referees] = await Promise.all([
    db.season.findMany({ orderBy: { startDate: 'desc' } }),
    db.team.findMany({ orderBy: { name: 'asc' } }),
    db.user.findMany({
      where: { role: Role.REFEREE },
      select: { id: true, name: true },
    }),
  ])

  return (
    <LeagueMatchCreateWizard
      seasons={seasons.map((season) => ({
        id: season.id,
        name: season.name,
        footballFormat: season.footballFormat,
      }))}
      teams={teams}
      referees={referees}
    />
  )
}

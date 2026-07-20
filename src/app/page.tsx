import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardPath } from '@/lib/roles'
import { Role } from '@/lib/roles'
import { LandingPage } from '@/components/kelme/LandingPage'
import { db } from '@/lib/db'
import { MatchStatus } from '@prisma/client'
import { matchSideNames } from '@/lib/match-label'

export default async function HomePage() {
  const session = await auth()
  if (session) {
    redirect(getDashboardPath(session.user.role as Role))
  }

  const liveMatches = await db.match.findMany({
    where: { status: { in: [MatchStatus.LIVE, MatchStatus.HALFTIME] } },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      season: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  return (
    <LandingPage
      liveMatches={liveMatches.map((match) => {
        const sides = matchSideNames(match)
        return {
          id: match.id,
          homeTeam: sides.home,
          awayTeam: sides.away,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          status: match.status,
          venue: match.venue,
          scheduledAt: match.scheduledAt.toISOString(),
          seasonName: match.season?.name ?? 'Amistoso',
        }
      })}
    />
  )
}
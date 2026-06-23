import {
  createPrismaClient,
  DEMO_EMAIL_DOMAIN,
  DEMO_ID_PREFIX,
} from './lib/db-client'

const { prisma, pool } = createPrismaClient()

async function main() {
  console.log('🗑️  Eliminando datos demo...\n')

  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_EMAIL_DOMAIN } },
    select: { id: true, email: true },
  })

  const demoUserIds = demoUsers.map((u) => u.id)

  const demoPlayers = await prisma.player.findMany({
    where: {
      OR: [
        { id: { startsWith: DEMO_ID_PREFIX } },
        { userId: { in: demoUserIds } },
      ],
    },
    select: { id: true },
  })
  const demoPlayerIds = demoPlayers.map((p) => p.id)

  const demoMatches = await prisma.match.findMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
    select: { id: true },
  })
  const demoMatchIds = demoMatches.map((m) => m.id)

  const demoTeams = await prisma.team.findMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
    select: { id: true },
  })
  const demoTeamIds = demoTeams.map((t) => t.id)

  // Desvincular coaches antes de borrar equipos
  await prisma.team.updateMany({
    where: { id: { in: demoTeamIds } },
    data: { coachId: null },
  })

  await prisma.matchEvent.deleteMany({
    where: { matchId: { in: demoMatchIds } },
  })

  await prisma.callUp.deleteMany({
    where: { matchId: { in: demoMatchIds } },
  })

  await prisma.playerEvaluation.deleteMany({
    where: {
      OR: [
        { playerId: { in: demoPlayerIds } },
        { coachId: { in: demoUserIds } },
      ],
    },
  })

  await prisma.match.deleteMany({
    where: { id: { in: demoMatchIds } },
  })

  await prisma.season.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  })

  await prisma.player.deleteMany({
    where: { id: { in: demoPlayerIds } },
  })

  await prisma.team.deleteMany({
    where: { id: { in: demoTeamIds } },
  })

  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: demoUserIds } },
  })

  console.log(`✅ Eliminados:`)
  console.log(`   ${deletedUsers.count} usuarios demo`)
  console.log(`   ${demoTeamIds.length} equipos`)
  console.log(`   ${demoPlayerIds.length} jugadores`)
  console.log(`   ${demoMatchIds.length} partidos`)
  console.log(`\nLos usuarios base (admin@liga.com, etc.) no fueron afectados.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })

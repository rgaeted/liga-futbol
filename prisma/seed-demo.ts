import bcrypt from 'bcryptjs'
import {
  EventType,
  MatchStatus,
  Role,
  type PrismaClient,
} from '@prisma/client'
import {
  createPrismaClient,
  DEMO_EMAIL_DOMAIN,
  DEMO_ID_PREFIX,
  DEMO_PASSWORD,
} from './lib/db-client'

const { prisma, pool } = createPrismaClient()

type PlayerSeed = {
  id: string
  userId: string
  email: string
  name: string
  jerseyNumber: number
  position: string
}

async function upsertUser(
  id: string,
  email: string,
  name: string,
  role: Role,
  passwordHash: string
) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { id, email, name, role, passwordHash },
  })
}

async function upsertPlayer(
  data: PlayerSeed,
  teamId: string,
  passwordHash: string,
  stats?: { goals?: number; assists?: number; yellowCards?: number; redCards?: number }
) {
  await upsertUser(data.userId, data.email, data.name, Role.PLAYER, passwordHash)
  return prisma.player.upsert({
    where: { userId: data.userId },
    update: {
      teamId,
      jerseyNumber: data.jerseyNumber,
      position: data.position,
      goals: stats?.goals ?? 0,
      assists: stats?.assists ?? 0,
      yellowCards: stats?.yellowCards ?? 0,
      redCards: stats?.redCards ?? 0,
    },
    create: {
      id: data.id,
      userId: data.userId,
      teamId,
      jerseyNumber: data.jerseyNumber,
      position: data.position,
      goals: stats?.goals ?? 0,
      assists: stats?.assists ?? 0,
      yellowCards: stats?.yellowCards ?? 0,
      redCards: stats?.redCards ?? 0,
    },
  })
}

function buildPlayers(
  teamSlug: 'norte' | 'sur',
  roster: Array<{ num: number; name: string; position: string }>
): PlayerSeed[] {
  return roster.map(({ num, name, position }) => {
    const suffix = String(num).padStart(2, '0')
    return {
      id: `${DEMO_ID_PREFIX}player-${teamSlug}-${suffix}`,
      userId: `${DEMO_ID_PREFIX}user-player-${teamSlug}-${suffix}`,
      email: `demo-${teamSlug}-${suffix}${DEMO_EMAIL_DOMAIN}`,
      name,
      jerseyNumber: num,
      position,
    }
  })
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  console.log('🌱 Cargando datos demo Torneos Kelme...\n')

  // --- Usuarios base demo (admin opcional para pruebas) ---
  await upsertUser(
    `${DEMO_ID_PREFIX}user-admin`,
    `demo-admin${DEMO_EMAIL_DOMAIN}`,
    'Admin Demo Kelme',
    Role.ADMIN,
    passwordHash
  )

  const coachNorte = await upsertUser(
    `${DEMO_ID_PREFIX}user-coach-norte`,
    `demo-dt-norte${DEMO_EMAIL_DOMAIN}`,
    'DT Kelme Norte',
    Role.COACH,
    passwordHash
  )

  const coachSur = await upsertUser(
    `${DEMO_ID_PREFIX}user-coach-sur`,
    `demo-dt-sur${DEMO_EMAIL_DOMAIN}`,
    'DT Kelme Sur',
    Role.COACH,
    passwordHash
  )

  const referee1 = await upsertUser(
    `${DEMO_ID_PREFIX}user-referee-1`,
    `demo-arbitro${DEMO_EMAIL_DOMAIN}`,
    'Árbitro Demo',
    Role.REFEREE,
    passwordHash
  )

  await upsertUser(
    `${DEMO_ID_PREFIX}user-referee-2`,
    `demo-arbitro-2${DEMO_EMAIL_DOMAIN}`,
    'Árbitro Suplente',
    Role.REFEREE,
    passwordHash
  )

  // --- Equipos ---
  const teamNorte = await prisma.team.upsert({
    where: { id: `${DEMO_ID_PREFIX}team-norte` },
    update: { name: 'Kelme Norte FC', coachId: coachNorte.id },
    create: {
      id: `${DEMO_ID_PREFIX}team-norte`,
      name: 'Kelme Norte FC',
      coachId: coachNorte.id,
    },
  })

  const teamSur = await prisma.team.upsert({
    where: { id: `${DEMO_ID_PREFIX}team-sur` },
    update: { name: 'Kelme Sur FC', coachId: coachSur.id },
    create: {
      id: `${DEMO_ID_PREFIX}team-sur`,
      name: 'Kelme Sur FC',
      coachId: coachSur.id,
    },
  })

  // --- Jugadores ---
  const norteRoster = buildPlayers('norte', [
    { num: 1, name: 'Matías Rojas', position: 'Arquero' },
    { num: 2, name: 'Diego Fuentes', position: 'Defensa' },
    { num: 4, name: 'Tomás Silva', position: 'Defensa' },
    { num: 6, name: 'Nico Vega', position: 'Mediocampista' },
    { num: 8, name: 'Lucas Morales', position: 'Mediocampista' },
    { num: 10, name: 'Juan Pérez Demo', position: 'Delantero' },
    { num: 11, name: 'Felipe Castro', position: 'Delantero' },
    { num: 14, name: 'Andrés Muñoz', position: 'Mediocampista' },
  ])

  const surRoster = buildPlayers('sur', [
    { num: 1, name: 'Carlos Mendoza', position: 'Arquero' },
    { num: 3, name: 'Pablo Herrera', position: 'Defensa' },
    { num: 5, name: 'Sebastián López', position: 'Defensa' },
    { num: 7, name: 'Marco Soto', position: 'Mediocampista' },
    { num: 9, name: 'Ignacio Reyes', position: 'Delantero' },
    { num: 10, name: 'Cristóbal Núñez', position: 'Delantero' },
    { num: 17, name: 'Rodrigo Pizarro', position: 'Mediocampista' },
    { num: 21, name: 'Benjamín Torres', position: 'Delantero' },
  ])

  const playersNorte = await Promise.all(
    norteRoster.map((p, i) =>
      upsertPlayer(p, teamNorte.id, passwordHash, {
        goals: i === 5 ? 3 : i === 6 ? 1 : 0,
        assists: i === 4 ? 2 : 0,
        yellowCards: i === 2 ? 1 : 0,
      })
    )
  )

  const playersSur = await Promise.all(
    surRoster.map((p, i) =>
      upsertPlayer(p, teamSur.id, passwordHash, {
        goals: i === 4 ? 2 : 0,
        yellowCards: i === 3 ? 1 : 0,
      })
    )
  )

  // --- Temporada ---
  const season = await prisma.season.upsert({
    where: { id: `${DEMO_ID_PREFIX}season-2026` },
    update: {
      name: 'Torneos Kelme 2026',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-11-30'),
      isActive: true,
    },
    create: {
      id: `${DEMO_ID_PREFIX}season-2026`,
      name: 'Torneos Kelme 2026',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-11-30'),
      isActive: true,
    },
  })

  const now = new Date()
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // --- Partido FINALIZADO (historial jugador + stats) ---
  const matchFinished = await prisma.match.upsert({
    where: { id: `${DEMO_ID_PREFIX}match-finished` },
    update: {
      status: MatchStatus.FINISHED,
      homeScore: 2,
      awayScore: 1,
      refereeId: referee1.id,
    },
    create: {
      id: `${DEMO_ID_PREFIX}match-finished`,
      seasonId: season.id,
      homeTeamId: teamNorte.id,
      awayTeamId: teamSur.id,
      refereeId: referee1.id,
      scheduledAt: yesterday,
      venue: 'Cancha Kelme Centro',
      status: MatchStatus.FINISHED,
      homeScore: 2,
      awayScore: 1,
    },
  })

  await prisma.matchEvent.deleteMany({ where: { matchId: matchFinished.id } })
  await seedFinishedEvents(matchFinished.id, teamNorte.id, teamSur.id, playersNorte, playersSur)

  // --- Partido EN VIVO (marcador en vivo) ---
  const matchLive = await prisma.match.upsert({
    where: { id: `${DEMO_ID_PREFIX}match-live` },
    update: {
      status: MatchStatus.LIVE,
      homeScore: 1,
      awayScore: 0,
      refereeId: referee1.id,
    },
    create: {
      id: `${DEMO_ID_PREFIX}match-live`,
      seasonId: season.id,
      homeTeamId: teamNorte.id,
      awayTeamId: teamSur.id,
      refereeId: referee1.id,
      scheduledAt: now,
      venue: 'Estadio Kelme',
      status: MatchStatus.LIVE,
      homeScore: 1,
      awayScore: 0,
    },
  })

  await prisma.matchEvent.deleteMany({ where: { matchId: matchLive.id } })
  await prisma.matchEvent.createMany({
    data: [
      { matchId: matchLive.id, type: EventType.KICKOFF, minute: 0, teamId: teamNorte.id },
      {
        matchId: matchLive.id,
        type: EventType.GOAL,
        minute: 12,
        teamId: teamNorte.id,
        playerId: playersNorte[5].id,
      },
      {
        matchId: matchLive.id,
        type: EventType.YELLOW_CARD,
        minute: 28,
        teamId: teamSur.id,
        playerId: playersSur[3].id,
      },
      {
        matchId: matchLive.id,
        type: EventType.SHOT_ON_TARGET,
        minute: 35,
        teamId: teamNorte.id,
        playerId: playersNorte[6].id,
      },
    ],
  })

  // --- Partido PROGRAMADO (citaciones DT) ---
  const matchScheduled = await prisma.match.upsert({
    where: { id: `${DEMO_ID_PREFIX}match-scheduled` },
    update: {
      status: MatchStatus.SCHEDULED,
      homeScore: 0,
      awayScore: 0,
      refereeId: referee1.id,
      scheduledAt: inThreeDays,
    },
    create: {
      id: `${DEMO_ID_PREFIX}match-scheduled`,
      seasonId: season.id,
      homeTeamId: teamSur.id,
      awayTeamId: teamNorte.id,
      refereeId: referee1.id,
      scheduledAt: inThreeDays,
      venue: 'Complejo Kelme Sur',
      status: MatchStatus.SCHEDULED,
    },
  })

  // --- Citaciones ---
  await seedCallUps(matchFinished.id, playersNorte, playersSur)
  await seedCallUps(matchLive.id, playersNorte, playersSur)
  await seedCallUps(matchScheduled.id, playersNorte, playersSur)

  // --- Evaluaciones DT ---
  await prisma.playerEvaluation.deleteMany({
    where: {
      playerId: { in: [...playersNorte, ...playersSur].map((p) => p.id) },
    },
  })

  await prisma.playerEvaluation.createMany({
    data: [
      {
        playerId: playersNorte[5].id,
        coachId: coachNorte.id,
        matchId: matchFinished.id,
        rating: 8,
        notes: 'Muy activo en el ataque, buena definición.',
      },
      {
        playerId: playersNorte[4].id,
        coachId: coachNorte.id,
        matchId: matchFinished.id,
        rating: 7,
        notes: 'Distribución correcta, mejorar presión.',
      },
      {
        playerId: playersSur[4].id,
        coachId: coachSur.id,
        matchId: matchFinished.id,
        rating: 6,
        notes: 'Gol importante, poca participación en el segundo tiempo.',
      },
    ],
  })

  console.log('✅ Datos demo cargados correctamente\n')
  printCredentials()
}

async function seedCallUps(
  matchId: string,
  homePlayers: { id: string }[],
  awayPlayers: { id: string }[]
) {
  await prisma.callUp.deleteMany({ where: { matchId } })

  const starters = homePlayers.slice(0, 5).map((p) => p.id)
  const subs = homePlayers.slice(5).map((p) => p.id)
  const awayStarters = awayPlayers.slice(0, 5).map((p) => p.id)
  const awaySubs = awayPlayers.slice(5).map((p) => p.id)

  const all = [
    ...starters.map((playerId) => ({ matchId, playerId, isStarter: true })),
    ...subs.map((playerId) => ({ matchId, playerId, isStarter: false })),
    ...awayStarters.map((playerId) => ({ matchId, playerId, isStarter: true })),
    ...awaySubs.map((playerId) => ({ matchId, playerId, isStarter: false })),
  ]

  await prisma.callUp.createMany({ data: all })
}

async function seedFinishedEvents(
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
  homePlayers: { id: string }[],
  awayPlayers: { id: string }[]
) {
  await prisma.matchEvent.createMany({
    data: [
      { matchId, type: EventType.KICKOFF, minute: 0, teamId: homeTeamId },
      {
        matchId,
        type: EventType.GOAL,
        minute: 23,
        teamId: homeTeamId,
        playerId: homePlayers[5].id,
      },
      {
        matchId,
        type: EventType.YELLOW_CARD,
        minute: 34,
        teamId: awayTeamId,
        playerId: awayPlayers[3].id,
      },
      {
        matchId,
        type: EventType.GOAL,
        minute: 55,
        teamId: awayTeamId,
        playerId: awayPlayers[4].id,
      },
      {
        matchId,
        type: EventType.GOAL,
        minute: 78,
        teamId: homeTeamId,
        playerId: homePlayers[6].id,
      },
      { matchId, type: EventType.FULLTIME, minute: 90, teamId: homeTeamId },
    ],
  })
}

function printCredentials() {
  console.log('── Credenciales demo (password: password123) ──')
  console.log('Admin:     demo-admin@demo.torneoskelme.cl')
  console.log('DT Norte:  demo-dt-norte@demo.torneoskelme.cl')
  console.log('DT Sur:    demo-dt-sur@demo.torneoskelme.cl')
  console.log('Árbitro:   demo-arbitro@demo.torneoskelme.cl')
  console.log('Jugador:   demo-norte-10@demo.torneoskelme.cl  (Juan Pérez Demo)')
  console.log('')
  console.log('── Partidos demo ──')
  console.log('Finalizado:  /live/demo-match-finished')
  console.log('En vivo:     /live/demo-match-live')
  console.log('Programado:  citaciones en /coach (DT Norte o Sur)')
  console.log('')
  console.log('── Borrar datos demo ──')
  console.log('npm run db:clear:demo')
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

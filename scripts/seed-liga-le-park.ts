#!/usr/bin/env tsx
/**
 * Crea la org Liga Le Park con categoría +35, 10 equipos y 15 jugadores demo por equipo
 * (Person sin cuenta — listos para asignar usuario después).
 *
 * Uso: npx tsx scripts/seed-liga-le-park.ts
 * Idempotente: re-ejecutar actualiza nombres/equipo/dorsal sin duplicar.
 */
import 'dotenv/config'
import { MembershipRole } from '@prisma/client'
import { createPrismaClient } from '../prisma/lib/db-client'

const { prisma, pool } = createPrismaClient()

const ORG_ID = 'org_liga_le_park'
const ORG_SLUG = 'liga-le-park'
const ORG_NAME = 'Liga Le Park'
const CATEGORY_ID = 'fcat_llp_plus35'
const CATEGORY_NAME = '+35'
const ID_PREFIX = 'llp'

const TEAMS = [
  { id: `${ID_PREFIX}-team-bufalos`, slug: 'bufalos', name: 'Bufalos' },
  { id: `${ID_PREFIX}-team-manque`, slug: 'manque', name: 'Manque FC' },
  { id: `${ID_PREFIX}-team-picana`, slug: 'picana', name: 'Picana' },
  { id: `${ID_PREFIX}-team-huevo`, slug: 'huevo', name: 'Huevo FC' },
  { id: `${ID_PREFIX}-team-remalinhos`, slug: 'remalinhos', name: 'Remalinhos' },
  { id: `${ID_PREFIX}-team-urnav`, slug: 'urnav', name: 'Urnav FC' },
  { id: `${ID_PREFIX}-team-guadalina`, slug: 'guadalina', name: 'Guadalina' },
  { id: `${ID_PREFIX}-team-cabo-suelto`, slug: 'cabo-suelto', name: 'Cabo Suelto' },
  { id: `${ID_PREFIX}-team-tocayo`, slug: 'tocayo', name: 'Tocayo' },
  { id: `${ID_PREFIX}-team-chicha-amigo`, slug: 'chicha-amigo', name: 'Chicha Amigo' },
] as const

const PLAYERS_PER_TEAM = 15

const POSITIONS = [
  'Arquero',
  'Defensa central',
  'Defensa central',
  'Lateral derecho',
  'Lateral izquierdo',
  'Mediocampista',
  'Mediocampista',
  'Mediocampista',
  'Volante',
  'Extremo derecho',
  'Extremo izquierdo',
  'Delantero',
  'Delantero',
  'Defensa',
  'Mediocampista',
] as const

const FIRST_NAMES = [
  'Matías', 'Diego', 'Tomás', 'Nico', 'Lucas', 'Felipe', 'Andrés', 'Sebastián',
  'Cristóbal', 'Ignacio', 'Rodrigo', 'Pablo', 'Camilo', 'Benjamín', 'Martín',
  'Javier', 'Gonzalo', 'Francisco', 'Alejandro', 'Maximiliano', 'Eduardo',
  'Hernán', 'Patricio', 'Claudio', 'Marcelo', 'Ricardo', 'Daniel', 'Carlos',
  'Jorge', 'Mauricio', 'Fernando', 'Sergio', 'Víctor', 'Roberto', 'Alonso',
  'Bruno', 'Emilio', 'Gabriel', 'Hugo', 'Iván', 'Jaime', 'Leonardo', 'Manuel',
  'Oscar', 'Pedro', 'Raúl', 'Simón', 'Vicente', 'Xavier', 'Yago',
]

const LAST_NAMES = [
  'Rojas', 'Fuentes', 'Silva', 'Vega', 'Morales', 'Castro', 'Muñoz', 'Pérez',
  'González', 'López', 'Martínez', 'Sánchez', 'Ramírez', 'Torres', 'Flores',
  'Rivera', 'Gómez', 'Díaz', 'Herrera', 'Vargas', 'Romero', 'Soto', 'Contreras',
  'Sepúlveda', 'Miranda', 'Figueroa', 'Espinoza', 'Valenzuela', 'Tapia', 'Navarro',
  'Araya', 'Campos', 'Jara', 'Reyes', 'Bravo', 'Carrasco', 'Ortiz', 'Núñez',
  'Medina', 'Aguilera', 'Poblete', 'Salazar', 'Cortés', 'Molina', 'Vidal',
  'Henríquez', 'Bustos', 'Parra', 'Zúñiga', 'Donoso',
]

function playerName(teamIndex: number, num: number) {
  const idx = teamIndex * PLAYERS_PER_TEAM + (num - 1)
  return {
    firstName: FIRST_NAMES[idx % FIRST_NAMES.length]!,
    lastName: LAST_NAMES[(idx * 3 + teamIndex) % LAST_NAMES.length]!,
  }
}

async function grantOrgAdmin(email: string, organizationId: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return false

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: { organizationId, userId: user.id },
    },
    update: { roles: [MembershipRole.ORG_ADMIN] },
    create: {
      organizationId,
      userId: user.id,
      roles: [MembershipRole.ORG_ADMIN],
    },
  })
  return true
}

async function main() {
  console.log(`🏟️  Sembrando ${ORG_NAME}…\n`)

  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {
      name: ORG_NAME,
      status: 'ACTIVE',
      primaryColor: '#2D5016',
      secondaryColor: '#F5E6C8',
    },
    create: {
      id: ORG_ID,
      slug: ORG_SLUG,
      name: ORG_NAME,
      status: 'ACTIVE',
      primaryColor: '#2D5016',
      secondaryColor: '#F5E6C8',
    },
  })

  const category = await prisma.friendlyCategory.upsert({
    where: { id: CATEGORY_ID },
    update: {
      name: CATEGORY_NAME,
      isActive: true,
      organizationId: org.id,
    },
    create: {
      id: CATEGORY_ID,
      organizationId: org.id,
      name: CATEGORY_NAME,
      description: 'Categoría +35 años',
      isActive: true,
    },
  })

  let teamCount = 0
  let playerCount = 0

  for (let t = 0; t < TEAMS.length; t++) {
    const teamDef = TEAMS[t]!
    const team = await prisma.team.upsert({
      where: { id: teamDef.id },
      update: { name: teamDef.name, organizationId: org.id },
      create: {
        id: teamDef.id,
        name: teamDef.name,
        organizationId: org.id,
        color: '#2D5016',
      },
    })
    teamCount++

    for (let num = 1; num <= PLAYERS_PER_TEAM; num++) {
      const suffix = String(num).padStart(2, '0')
      const personId = `${ID_PREFIX}-person-${teamDef.slug}-${suffix}`
      const playerId = `${ID_PREFIX}-player-${teamDef.slug}-${suffix}`
      const { firstName, lastName } = playerName(t, num)
      const position = POSITIONS[(num - 1) % POSITIONS.length]!

      const person = await prisma.person.upsert({
        where: { id: personId },
        update: { firstName, lastName },
        create: { id: personId, firstName, lastName },
      })

      const player = await prisma.player.upsert({
        where: {
          personId_organizationId: {
            personId: person.id,
            organizationId: org.id,
          },
        },
        update: {
          teamId: team.id,
          jerseyNumber: num,
          position,
          primaryPosition: position,
        },
        create: {
          id: playerId,
          personId: person.id,
          organizationId: org.id,
          teamId: team.id,
          jerseyNumber: num,
          position,
          primaryPosition: position,
        },
      })

      await prisma.playerCategory.upsert({
        where: {
          playerId_friendlyCategoryId: {
            playerId: player.id,
            friendlyCategoryId: category.id,
          },
        },
        create: {
          playerId: player.id,
          friendlyCategoryId: category.id,
        },
        update: {},
      })

      playerCount++
    }
  }

  const adminEmails = ['ricardo.gaete@gmail.com']
  const granted: string[] = []
  for (const email of adminEmails) {
    if (await grantOrgAdmin(email, org.id)) granted.push(email)
  }

  console.log('✅ Listo')
  console.log(`   Org:     /${org.slug} (${org.name})`)
  console.log(`   Categoría: ${category.name}`)
  console.log(`   Equipos: ${teamCount}`)
  console.log(`   Jugadores: ${playerCount} (sin cuenta — asigna usuario desde admin)`)
  if (granted.length > 0) {
    console.log(`   Admins:  ${granted.join(', ')}`)
  } else {
    console.log('   Admins:  (ningún email conocido encontrado — otorga ORG_ADMIN desde plataforma)')
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })

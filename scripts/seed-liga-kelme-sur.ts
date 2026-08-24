#!/usr/bin/env tsx
/**
 * Crea Liga Kelme Sur: 4 categorías amistosas, 8 equipos, 15 jugadores ficticios por equipo.
 * Admin: felipe@ligalab.cl (crea usuario con password123 si no existe).
 *
 * Uso: npx tsx scripts/seed-liga-kelme-sur.ts
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { MembershipRole } from '@prisma/client'
import { createPrismaClient } from '../prisma/lib/db-client'

const { prisma, pool } = createPrismaClient()

const ORG_ID = 'org_liga_kelme_sur'
const ORG_SLUG = 'liga-kelme-sur'
const ORG_NAME = 'Liga Kelme Sur'
const ID_PREFIX = 'lks'
const ADMIN_EMAIL = 'felipe@ligalab.cl'
const ADMIN_NAME = 'Felipe LigaLab'
const ADMIN_PASSWORD = 'password123'

const CATEGORIES = [
  { id: 'fcat_lks_senior', name: 'Senior', slug: 'senior', description: 'Categoría Senior' },
  { id: 'fcat_lks_plus35', name: '+35', slug: 'plus35', description: 'Categoría +35 años' },
  { id: 'fcat_lks_plus45', name: '+45', slug: 'plus45', description: 'Categoría +45 años' },
  { id: 'fcat_lks_intermedia', name: 'Intermedia', slug: 'intermedia', description: 'Categoría Intermedia' },
] as const

const TEAMS = [
  { id: `${ID_PREFIX}-team-linares`, slug: 'linares', name: 'Deportes Linares', categorySlug: 'senior' },
  { id: `${ID_PREFIX}-team-union-sur`, slug: 'union-sur', name: 'Unión Sur', categorySlug: 'senior' },
  { id: `${ID_PREFIX}-team-cobre-sur`, slug: 'cobre-sur', name: 'Cobre Sur FC', categorySlug: 'plus35' },
  { id: `${ID_PREFIX}-team-rio-bueno`, slug: 'rio-bueno', name: 'Río Bueno', categorySlug: 'plus35' },
  { id: `${ID_PREFIX}-team-notros`, slug: 'notros', name: 'Los Notros', categorySlug: 'plus45' },
  { id: `${ID_PREFIX}-team-villa-alegre`, slug: 'villa-alegre', name: 'Villa Alegre', categorySlug: 'plus45' },
  { id: `${ID_PREFIX}-team-punta-fc`, slug: 'punta-fc', name: 'Punta FC', categorySlug: 'intermedia' },
  { id: `${ID_PREFIX}-team-austral`, slug: 'austral', name: 'Austral FC', categorySlug: 'intermedia' },
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
  'Arturo', 'Bastián', 'César', 'Damián', 'Esteban', 'Fabian', 'Germán', 'Héctor',
  'Ismael', 'Joaquín', 'Kevin', 'Lautaro', 'Marcos', 'Nelson', 'Orlando', 'Patricio',
  'Quentin', 'Renato', 'Samuel', 'Tobías', 'Ulises', 'Valentín', 'Walter', 'Yerko',
  'Adrián', 'Boris', 'Cristián', 'Domingo', 'Elías', 'Fabián', 'Guillermo', 'Hugo',
  'Iván', 'Jorge', 'Karl', 'Luis', 'Mario', 'Néstor', 'Omar', 'Pascual',
  'Ramiro', 'Salvador', 'Tomás', 'Ubaldo', 'Víctor', 'Wilson', 'Ximén', 'Yonathan',
  'Alfredo', 'Bernardo', 'Ciro', 'Dario', 'Enrique', 'Felipe', 'Gustavo', 'Horacio',
  'Ignacio', 'Julio', 'Klaus', 'Leandro', 'Miguel', 'Norberto', 'Osvaldo', 'Pablo',
  'Rafael', 'Santiago', 'Teodoro', 'Uriel', 'Vicente', 'William', 'Yahir', 'Zacarías',
  'Amaro', 'Benito', 'Camilo', 'Dante', 'Efraín', 'Flavio', 'Gonzalo', 'Hernán',
  'Iker', 'Jacinto', 'Kaleb', 'Lorenzo', 'Mateo', 'Nicolás', 'Octavio', 'Pedro',
  'Quique', 'Rubén', 'Sergio', 'Tadeo', 'Ulrich', 'Vladimir', 'Williams', 'Yago',
  'Álvaro', 'Bruno', 'Claudio', 'Diego', 'Emilio', 'Francisco', 'Gabriel', 'Humberto',
  'Javier', 'Leonardo', 'Manuel', 'Nicolás', 'Oscar', 'Rodrigo', 'Sebastián', 'Tito',
]

const LAST_NAMES = [
  'Ahumada', 'Becerra', 'Cáceres', 'Duarte', 'Escobar', 'Farias', 'Gallardo', 'Huerta',
  'Ibáñez', 'Jofré', 'Klein', 'Lara', 'Maldonado', 'Nieto', 'Orellana', 'Palma',
  'Quezada', 'Riquelme', 'Sandoval', 'Trujillo', 'Urrutia', 'Villagrán', 'Wolf', 'Yáñez',
  'Zamorano', 'Acuña', 'Bustamante', 'Cornejo', 'Delgado', 'Estay', 'Fuentes', 'Godoy',
  'Hidalgo', 'Inostroza', 'Jara', 'Kruger', 'Lagos', 'Méndez', 'Navarrete', 'Olivares',
  'Pizarro', 'Quinteros', 'Rivas', 'Salinas', 'Tapia', 'Ulloa', 'Vera', 'Wenzel',
  'Xavier', 'Yávar', 'Zavala', 'Aravena', 'Baeza', 'Cisternas', 'Duran', 'Elgueta',
  'Farías', 'Gutiérrez', 'Hurtado', 'Iturra', 'Jiménez', 'Kast', 'Leiva', 'Mora',
  'Núñez', 'Ocampo', 'Paredes', 'Quiroga', 'Rojas', 'Silva', 'Toro', 'Uribe',
  'Valdés', 'Ward', 'Yáñez', 'Zúñiga', 'Alarcón', 'Bustos', 'Carrasco', 'Díaz',
  'Espinoza', 'Flores', 'González', 'Henríquez', 'Ibarra', 'Jara', 'Keller', 'López',
  'Martínez', 'Naranjo', 'Ortiz', 'Pérez', 'Ramírez', 'Soto', 'Torres', 'Vargas',
  'Aguilera', 'Bravo', 'Castro', 'Contreras', 'Donoso', 'Espinoza', 'Figueroa', 'Gómez',
  'Herrera', 'Inzunza', 'Jara', 'Kastillo', 'Luna', 'Molina', 'Navarro', 'Oyarzún',
]

function playerName(teamIndex: number, num: number) {
  const idx = teamIndex * PLAYERS_PER_TEAM + (num - 1)
  return {
    firstName: FIRST_NAMES[idx % FIRST_NAMES.length]!,
    lastName: LAST_NAMES[(idx * 5 + teamIndex * 2) % LAST_NAMES.length]!,
  }
}

async function ensureOrgAdmin(email: string, name: string, organizationId: string) {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name, passwordHash },
  })
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
  return user
}

async function main() {
  console.log(`🏟️  Sembrando ${ORG_NAME}…\n`)

  const categoryBySlug = new Map(CATEGORIES.map((c) => [c.slug, c]))

  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {
      name: ORG_NAME,
      status: 'ACTIVE',
      primaryColor: '#CD212A',
      secondaryColor: '#1B2838',
    },
    create: {
      id: ORG_ID,
      slug: ORG_SLUG,
      name: ORG_NAME,
      status: 'ACTIVE',
      primaryColor: '#CD212A',
      secondaryColor: '#1B2838',
    },
  })

  for (const cat of CATEGORIES) {
    await prisma.friendlyCategory.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        description: cat.description,
        isActive: true,
        organizationId: org.id,
      },
      create: {
        id: cat.id,
        organizationId: org.id,
        name: cat.name,
        description: cat.description,
        isActive: true,
      },
    })
  }

  let teamCount = 0
  let playerCount = 0

  for (let t = 0; t < TEAMS.length; t++) {
    const teamDef = TEAMS[t]!
    const category = categoryBySlug.get(teamDef.categorySlug)
    if (!category) throw new Error(`Categoría no encontrada: ${teamDef.categorySlug}`)

    const team = await prisma.team.upsert({
      where: { id: teamDef.id },
      update: { name: teamDef.name, organizationId: org.id },
      create: {
        id: teamDef.id,
        name: teamDef.name,
        organizationId: org.id,
        color: '#CD212A',
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

  const admin = await ensureOrgAdmin(ADMIN_EMAIL, ADMIN_NAME, org.id)

  console.log('✅ Listo')
  console.log(`   Org:        /${org.slug} (${org.name})`)
  console.log(`   Categorías: ${CATEGORIES.map((c) => c.name).join(', ')}`)
  console.log(`   Equipos:    ${teamCount} (2 por categoría)`)
  console.log(`   Jugadores:  ${playerCount} (sin cuenta — asigna usuario desde admin)`)
  console.log(`   Admin:      ${admin.email} (pass: ${ADMIN_PASSWORD} si cuenta nueva)`)
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

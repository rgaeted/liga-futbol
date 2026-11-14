#!/usr/bin/env tsx
/**
 * Carga la nómina del C.D. 21 de Mayo Puerto Varas (categoría 2017-2016) en la Kelme Cup Los Lagos 2026.
 * Por privacidad solo se guarda el nombre y la inicial del primer apellido (sin RUT ni fecha de nacimiento).
 *
 * Es idempotente (no repite jugadores con el mismo nombre en el equipo). Por defecto solo simula:
 *   npx tsx scripts/add-players-21-de-mayo.ts            # simulación
 *   npx tsx scripts/add-players-21-de-mayo.ts --apply    # escribe en la base
 */
import 'dotenv/config'
import { SeasonRosterStatus } from '@prisma/client'
import { createPrismaClient } from '../prisma/lib/db-client'

const ORG_SLUG = 'kelme'
const SEASON_NAME = 'Kelme Cup Los Lagos 2026'

/** Nombre y inicial del primer apellido, tal como se guardan. */
const PLAYERS: Array<{ firstName: string; lastInitial: string }> = [
  { firstName: 'Fabian Maximiliano', lastInitial: 'N' },
  { firstName: 'Cristobal Emilio', lastInitial: 'B' },
  { firstName: 'Felipe Andres', lastInitial: 'S' },
  { firstName: 'Jairo Alexander', lastInitial: 'R' },
  { firstName: 'Roni Alexander', lastInitial: 'S' },
  { firstName: 'Leonardo Antonio', lastInitial: 'A' },
  { firstName: 'Julian Ignacio', lastInitial: 'B' },
  { firstName: 'Emiliano Alejandro', lastInitial: 'C' },
  { firstName: 'Carlos Abrahan', lastInitial: 'R' },
  { firstName: 'Bastian Alexis', lastInitial: 'P' },
  { firstName: 'Lucas', lastInitial: 'M' },
]

const apply = process.argv.includes('--apply')
const log = (message: string) => console.log(`${apply ? '' : '[simulación] '}${message}`)

async function main() {
  const { prisma, pool } = createPrismaClient()
  try {
    const org = await prisma.organization.findFirst({ where: { slug: ORG_SLUG }, select: { id: true } })
    if (!org) throw new Error(`No existe la organización "${ORG_SLUG}".`)
    const season = await prisma.season.findFirst({
      where: { organizationId: org.id, name: SEASON_NAME },
      select: { id: true },
    })
    if (!season) throw new Error(`No existe la temporada "${SEASON_NAME}".`)

    const candidates = await prisma.seasonTeam.findMany({
      where: {
        seasonId: season.id,
        seasonCategory: { category: { name: { contains: '2017' } } },
        OR: [
          { team: { name: { contains: '21 de mayo', mode: 'insensitive' } } },
          { displayName: { contains: '21 de mayo', mode: 'insensitive' } },
        ],
      },
      include: {
        team: { select: { id: true, name: true, organizationId: true } },
        seasonCategory: { select: { category: { select: { id: true, name: true } } } },
      },
    })
    if (candidates.length !== 1) {
      throw new Error(
        `Se esperaba exactamente 1 equipo "21 de mayo" en 2017-2016 y hay ${candidates.length}: ${candidates
          .map((c) => `${c.team.name} (${c.id})`)
          .join(', ')}`,
      )
    }
    const seasonTeam = candidates[0]
    const category = seasonTeam.seasonCategory!.category
    console.log(`Equipo: ${seasonTeam.team.name} · Categoría: ${category.name}`)

    const existing = await prisma.player.findMany({
      where: { teamId: seasonTeam.teamId },
      select: { person: { select: { firstName: true, lastName: true } } },
    })
    const existingKeys = new Set(
      existing.map((p) => `${p.person.firstName} ${p.person.lastName}`.trim().toLowerCase()),
    )
    console.log(`Jugadores que ya tiene el equipo: ${existing.length}`)

    let created = 0
    for (const player of PLAYERS) {
      const lastName = `${player.lastInitial}.`
      const key = `${player.firstName} ${lastName}`.toLowerCase()
      if (existingKeys.has(key)) {
        log(`Ya existe: ${player.firstName} ${lastName}`)
        continue
      }
      log(`Agregar: ${player.firstName} ${lastName}`)
      created += 1
      if (!apply) continue
      await prisma.$transaction(async (tx) => {
        const person = await tx.person.create({ data: { firstName: player.firstName, lastName } })
        const created = await tx.player.create({
          data: { personId: person.id, organizationId: org.id, teamId: seasonTeam.teamId },
        })
        await tx.playerCategory.create({
          data: { playerId: created.id, friendlyCategoryId: category.id },
        })
        await tx.seasonRosterEntry.create({
          data: { seasonTeamId: seasonTeam.id, playerId: created.id, status: SeasonRosterStatus.ACTIVE },
        })
      })
    }
    console.log(`${apply ? 'Agregados' : 'Se agregarían'}: ${created} de ${PLAYERS.length}`)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

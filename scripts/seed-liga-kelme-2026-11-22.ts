#!/usr/bin/env tsx
/**
 * Carga la jornada del domingo 22-11-2026 de la Liga Kelme (2 categorías, 8 equipos, 12 partidos,
 * Fútbol 9) en la organización `kelme`. Idempotente: reutiliza categorías/equipos por nombre y
 * nunca pisa partidos ya creados (identidad = fixtureCode P01–P12 dentro de la temporada).
 *
 * Por defecto solo simula (dry-run). Para escribir en la base:
 *   npx tsx scripts/seed-liga-kelme-2026-11-22.ts --apply
 */
import 'dotenv/config'
import { FootballFormat, MatchPhase, MatchStatus, MatchType } from '@prisma/client'
import { createPrismaClient } from '../prisma/lib/db-client'
import { CUP_COMMUNE_CODE, CUP_REGION_CODE } from '../src/lib/copa-kelme-los-lagos'
import { buildMatchLocationFields } from '../src/lib/match-location'
import { BASIC_REFEREE_EVENT_TYPES } from '../src/lib/match-referee-event-presets'
import { deriveTeamColor } from '../src/lib/team-color'

const ORG_SLUG = 'kelme'
const SEASON_NAME = 'Liga Kelme 2026'
const VENUE = 'Canchas Colegio Puerto Varas'
const DATE = '2026-11-22'
const MATCH_MINUTES = 35

type Cat = '2015-2014' | '2013-2012'

const TEAMS: Record<string, { name: string; category: Cat }> = {
  'UE-1514': { name: 'Unión Española', category: '2015-2014' },
  'PAL-1514': { name: 'Palestino Puerto Montt', category: '2015-2014' },
  'DIN-1514': { name: 'Dinamo FC', category: '2015-2014' },
  'SPV-1514': { name: 'Sporting Puerto Varas', category: '2015-2014' },
  'UE-1312': { name: 'Unión Española', category: '2013-2012' },
  'PAL-1312': { name: 'Palestino Puerto Montt', category: '2013-2012' },
  'FV-1312': { name: 'Fernández Vial', category: '2013-2012' },
  'TUY-1312': { name: 'TUYO', category: '2013-2012' },
}

// [código, categoría, hora inicio, cancha, local, visita]
const MATCHES: [string, Cat, string, 1 | 2, string, string][] = [
  ['P01', '2015-2014', '09:00', 1, 'UE-1514', 'DIN-1514'],
  ['P02', '2015-2014', '09:00', 2, 'PAL-1514', 'SPV-1514'],
  ['P03', '2013-2012', '09:45', 1, 'UE-1312', 'FV-1312'],
  ['P04', '2013-2012', '09:45', 2, 'PAL-1312', 'TUY-1312'],
  ['P05', '2015-2014', '10:30', 1, 'UE-1514', 'SPV-1514'],
  ['P06', '2015-2014', '10:30', 2, 'PAL-1514', 'DIN-1514'],
  ['P07', '2013-2012', '11:15', 1, 'UE-1312', 'TUY-1312'],
  ['P08', '2013-2012', '11:15', 2, 'PAL-1312', 'FV-1312'],
  ['P09', '2015-2014', '12:00', 1, 'UE-1514', 'PAL-1514'],
  ['P10', '2015-2014', '12:00', 2, 'DIN-1514', 'SPV-1514'],
  ['P11', '2013-2012', '12:45', 1, 'UE-1312', 'PAL-1312'],
  ['P12', '2013-2012', '12:45', 2, 'FV-1312', 'TUY-1312'],
]

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
const apply = process.argv.includes('--apply')
const log = (m: string) => console.log(`${apply ? '' : '[simulación] '}${m}`)

async function main() {
  const { prisma, pool } = createPrismaClient()
  try {
    const org = await prisma.organization.findFirst({ where: { slug: ORG_SLUG }, select: { id: true } })
    if (!org) throw new Error(`No existe la organización "${ORG_SLUG}".`)
    console.log(apply ? 'Modo APLICAR: se escribirá en la base de datos.' : 'Modo simulación (usa --apply).')

    // Categorías
    const categoryIds = new Map<Cat, string>()
    for (const code of ['2015-2014', '2013-2012'] as const) {
      const existing = await prisma.friendlyCategory.findFirst({
        where: { organizationId: org.id, name: { contains: code.slice(0, 4) } },
        orderBy: { createdAt: 'asc' },
      })
      if (existing) {
        log(`Categoría existente: ${existing.name}`)
        categoryIds.set(code, existing.id)
      } else {
        log(`Crear categoría ${code}`)
        categoryIds.set(
          code,
          apply
            ? (await prisma.friendlyCategory.create({ data: { organizationId: org.id, name: code, isActive: true } })).id
            : `(nueva ${code})`,
        )
      }
    }

    // Temporada
    let season = await prisma.season.findFirst({ where: { organizationId: org.id, name: SEASON_NAME } })
    if (season) log(`Temporada existente: ${season.name}`)
    else {
      log(`Crear temporada ${SEASON_NAME} (Fútbol 9)`)
      if (apply) {
        season = await prisma.season.create({
          data: {
            organizationId: org.id,
            name: SEASON_NAME,
            startDate: new Date(`${DATE}T00:00:00-03:00`),
            endDate: new Date(`${DATE}T23:59:59-03:00`),
            footballFormat: FootballFormat.FUTBOL_9,
            isActive: true,
          },
        })
      }
    }

    // Categorías de la temporada
    const seasonCategoryIds = new Map<Cat, string>()
    let order = 0
    for (const [code, categoryId] of categoryIds) {
      order += 1
      if (!season) continue
      const existing = await prisma.seasonCategory.findFirst({ where: { seasonId: season.id, categoryId } })
      if (existing) seasonCategoryIds.set(code, existing.id)
      else {
        log(`Vincular categoría ${code} a la temporada`)
        if (apply) {
          const c = await prisma.seasonCategory.create({ data: { seasonId: season.id, categoryId, sortOrder: order } })
          seasonCategoryIds.set(code, c.id)
        }
      }
    }

    // Equipos (identidad = nombre + categoría)
    const orgTeams = await prisma.team.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, categoryId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    const teamIds = new Map<string, string>()
    let sortOrder = 0
    for (const [key, def] of Object.entries(TEAMS)) {
      sortOrder += 1
      const categoryId = categoryIds.get(def.category)!
      let teamId = orgTeams.find((t) => t.categoryId === categoryId && norm(t.name) === norm(def.name))?.id ?? null
      if (!teamId) {
        log(`Crear equipo ${def.name} (${def.category})`)
        if (apply) {
          teamId = (
            await prisma.team.create({
              data: { organizationId: org.id, name: def.name, categoryId, color: deriveTeamColor(def.name) },
            })
          ).id
        }
      }
      if (!teamId) continue
      teamIds.set(key, teamId)

      const seasonCategoryId = seasonCategoryIds.get(def.category)
      if (!season || !seasonCategoryId) continue
      const enrollment = await prisma.seasonTeam.findFirst({ where: { seasonCategoryId, teamId } })
      if (!enrollment) {
        log(`Inscribir ${def.name} en ${def.category}`)
        if (apply) {
          await prisma.seasonTeam.create({
            data: { seasonId: season.id, seasonCategoryId, teamId, displayName: def.name, status: 'REGISTERED', sortOrder },
          })
        }
      }
    }

    // Partidos
    const location = buildMatchLocationFields({ regionCode: CUP_REGION_CODE, communeCode: CUP_COMMUNE_CODE })
    for (const [code, cat, time, court, home, away] of MATCHES) {
      const existing = season
        ? await prisma.match.findFirst({ where: { seasonId: season.id, fixtureCode: code } })
        : null
      if (existing) {
        log(`${code} ya existe: se conserva`)
        continue
      }
      log(`Crear ${code} · ${time} · cancha ${court} · ${cat} · ${TEAMS[home]!.name} vs ${TEAMS[away]!.name}`)
      if (!apply || !season) continue

      const startAt = new Date(`${DATE}T${time}:00-03:00`)
      await prisma.match.create({
        data: {
          organizationId: org.id,
          matchType: MatchType.LEAGUE,
          seasonId: season.id,
          seasonCategoryId: seasonCategoryIds.get(cat) ?? null,
          homeTeamId: teamIds.get(home) ?? null,
          awayTeamId: teamIds.get(away) ?? null,
          footballFormat: FootballFormat.FUTBOL_9,
          scheduledAt: startAt,
          endsAt: new Date(startAt.getTime() + MATCH_MINUTES * 60_000),
          venue: VENUE,
          ...location,
          status: MatchStatus.SCHEDULED,
          refereeEventTypes: BASIC_REFEREE_EVENT_TYPES,
          fixtureCode: code,
          phase: MatchPhase.LEAGUE,
          court,
        },
      })
    }

    console.log(apply ? '\nListo. Revisa /kelme/admin/fixture.' : '\nSimulación terminada. Repite con --apply para escribir.')
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

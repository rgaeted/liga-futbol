#!/usr/bin/env tsx
import 'dotenv/config'
import { FootballFormat, MatchStatus, MatchType, type PrismaClient } from '@prisma/client'
import type { Pool } from 'pg'
import {
  addDaysIso,
  buildGroupFixture,
  CUP_CATEGORIES,
  CUP_COMMUNE_CODE,
  CUP_FOOTBALL_FORMAT,
  CUP_ORG_SLUG,
  CUP_REGION_CODE,
  CUP_SEASON_NAME,
  CUP_TEAMS,
  detectCupVariantFromCategoryKeys,
  parseCupSeedArgs,
  requireStartDate,
  scheduleCupMatches,
  type CupCategoryKey,
  type CupTeamKey,
} from '../src/lib/copa-kelme-los-lagos'
import { buildMatchLocationFields } from '../src/lib/match-location'
import { BASIC_REFEREE_EVENT_TYPES } from '../src/lib/match-referee-event-presets'
import { scheduleInputToIso } from '../src/lib/schedule-datetime'
import { deriveTeamColor } from '../src/lib/team-color'

let prisma: PrismaClient
let pool: Pool

function getDb() {
  if (!prisma) {
    const mod = require('../prisma/lib/db-client') as typeof import('../prisma/lib/db-client')
    const client = mod.createPrismaClient()
    prisma = client.prisma
    pool = client.pool
  }
  return { prisma, pool }
}

async function ensureCategory(
  organizationId: string,
  key: CupCategoryKey,
) {
  const { prisma } = getDb()
  const def = CUP_CATEGORIES[key]
  const byId = await prisma.friendlyCategory.findUnique({ where: { id: def.id } })
  if (byId) {
    return prisma.friendlyCategory.update({
      where: { id: def.id },
      data: { name: def.name, isActive: true, organizationId },
    })
  }
  const byName = await prisma.friendlyCategory.findFirst({
    where: { organizationId, name: def.name },
  })
  if (byName) return byName
  return prisma.friendlyCategory.create({
    data: {
      id: def.id,
      organizationId,
      name: def.name,
      description: 'Copa Kelme Los Lagos — infantil fútbol 7',
      isActive: true,
    },
  })
}

async function ensureTeam(organizationId: string, key: CupTeamKey) {
  const { prisma } = getDb()
  const def = CUP_TEAMS[key]
  const byName = await prisma.team.findFirst({
    where: { organizationId, name: def.name },
  })
  if (byName) return byName
  const color = deriveTeamColor(def.name)
  return prisma.team.upsert({
    where: { id: def.id },
    update: { name: def.name, organizationId, color },
    create: { id: def.id, name: def.name, organizationId, color },
  })
}

async function enrollTeams(
  seasonId: string,
  seasonCategoryId: string,
  categoryId: string,
  teamIds: { teamId: string; displayName: string; color: string | null }[],
) {
  const { prisma } = getDb()
  for (const [index, team] of teamIds.entries()) {
    await prisma.seasonTeam.upsert({
      where: {
        seasonCategoryId_teamId: {
          seasonCategoryId,
          teamId: team.teamId,
        },
      },
      create: {
        seasonId,
        seasonCategoryId,
        teamId: team.teamId,
        displayName: team.displayName,
        color: team.color,
        status: 'REGISTERED',
        sortOrder: index,
      },
      update: {
        displayName: team.displayName,
        status: 'REGISTERED',
        sortOrder: index,
      },
    })
  }
  void categoryId
}

async function seedGrupos(args: {
  organizationId: string
  variant: '4' | '6'
  startDate: string
  venue: string
  dryRun: boolean
  resetMatches: boolean
}) {
  const fixture = buildGroupFixture(args.variant)
  const scheduled = scheduleCupMatches(fixture.matches, args.startDate)
  if (args.dryRun) {
    console.log(`DRY-RUN grupos variant=${args.variant} start=${args.startDate}`)
    for (const match of scheduled) {
      console.log(
        `  J${match.round} ${match.scheduledAt} ${CUP_TEAMS[match.homeKey].name} vs ${CUP_TEAMS[match.awayKey].name} [${match.categoryKey}]`,
      )
    }
    return
  }

  const location = buildMatchLocationFields({
    regionCode: CUP_REGION_CODE,
    communeCode: CUP_COMMUNE_CODE,
  })
  if ('error' in location) throw new Error(location.error)

  const { prisma } = getDb()
  const categoryByKey = new Map<CupCategoryKey, { id: string }>()
  for (const key of fixture.categoryKeys) {
    categoryByKey.set(key, await ensureCategory(args.organizationId, key))
  }

  const teamByKey = new Map<CupTeamKey, { id: string; name: string; color: string | null }>()
  for (const key of fixture.teamKeys) {
    const team = await ensureTeam(args.organizationId, key)
    teamByKey.set(key, team)
  }

  let season = await prisma.season.findFirst({
    where: { organizationId: args.organizationId, name: CUP_SEASON_NAME },
    include: { seasonCategories: { include: { category: true } } },
  })

  if (season) {
    const existingKeys = season.seasonCategories.map((sc) => {
      const found = (Object.values(CUP_CATEGORIES) as { id: string; key: CupCategoryKey }[]).find(
        (c) => c.id === sc.categoryId || c.name === sc.category.name,
      )
      return found?.key ?? sc.category.name
    })
    const mapped = existingKeys.filter((k): k is CupCategoryKey =>
      k === 'infantil' || k === 'grupo-a' || k === 'grupo-b' || k === 'finales',
    )
    const detected = detectCupVariantFromCategoryKeys(mapped)
    if (detected && detected !== args.variant) {
      throw new Error(
        `La temporada "${CUP_SEASON_NAME}" ya existe como variant=${detected}. No mezclar con --variant=${args.variant}.`,
      )
    }
  } else {
    season = await prisma.season.create({
      data: {
        organizationId: args.organizationId,
        name: CUP_SEASON_NAME,
        startDate: new Date(scheduleInputToIso(args.startDate, '12:00')),
        endDate: new Date(scheduleInputToIso(addDaysIso(args.startDate, 35), '12:00')),
        footballFormat: FootballFormat.FUTBOL_7,
        seasonCategories: {
          create: fixture.categoryKeys.map((key, sortOrder) => ({
            categoryId: categoryByKey.get(key)!.id,
            sortOrder,
          })),
        },
      },
      include: { seasonCategories: { include: { category: true } } },
    })
  }

  const seasonCategoryByKey = new Map<CupCategoryKey, string>()
  for (const sc of season.seasonCategories) {
    const def = Object.values(CUP_CATEGORIES).find(
      (c) => c.id === sc.categoryId || c.name === sc.category.name,
    )
    if (def) seasonCategoryByKey.set(def.key, sc.id)
  }

  const groupKeys = fixture.categoryKeys.filter((k) => k !== 'finales')
  for (const key of groupKeys) {
    const scId = seasonCategoryByKey.get(key)
    const catId = categoryByKey.get(key)?.id
    if (!scId || !catId) throw new Error(`Falta SeasonCategory ${key}`)
    const keysForCat = fixture.matches
      .filter((m) => m.categoryKey === key)
      .flatMap((m) => [m.homeKey, m.awayKey])
    const uniqueKeys = [...new Set(keysForCat)]
    await enrollTeams(
      season.id,
      scId,
      catId,
      uniqueKeys.map((k) => {
        const team = teamByKey.get(k)!
        return { teamId: team.id, displayName: team.name, color: team.color }
      }),
    )
  }

  const finalesSc = seasonCategoryByKey.get('finales')
  const finalesCat = categoryByKey.get('finales')
  if (finalesSc && finalesCat) {
    await enrollTeams(
      season.id,
      finalesSc,
      finalesCat.id,
      fixture.teamKeys.map((k) => {
        const team = teamByKey.get(k)!
        return { teamId: team.id, displayName: team.name, color: team.color }
      }),
    )
  }

  if (args.resetMatches) {
    await prisma.match.deleteMany({
      where: {
        seasonId: season.id,
        status: MatchStatus.SCHEDULED,
        matchType: MatchType.LEAGUE,
      },
    })
  }

  let created = 0
  let skipped = 0
  for (const match of scheduled) {
    const home = teamByKey.get(match.homeKey)!
    const away = teamByKey.get(match.awayKey)!
    const seasonCategoryId = seasonCategoryByKey.get(match.categoryKey)!
    const existing = await prisma.match.findFirst({
      where: {
        seasonId: season.id,
        seasonCategoryId,
        homeTeamId: home.id,
        awayTeamId: away.id,
      },
    })
    if (existing) {
      skipped += 1
      continue
    }
    await prisma.match.create({
      data: {
        organizationId: args.organizationId,
        matchType: MatchType.LEAGUE,
        seasonId: season.id,
        seasonCategoryId,
        footballFormat: FootballFormat[CUP_FOOTBALL_FORMAT],
        homeTeamId: home.id,
        awayTeamId: away.id,
        scheduledAt: new Date(match.scheduledAt),
        venue: args.venue,
        refereeEventTypes: [...BASIC_REFEREE_EVENT_TYPES],
        ...location,
      },
    })
    created += 1
  }

  console.log(`✅ Grupos listos (${args.variant} equipos)`)
  console.log(`   Temporada: ${CUP_SEASON_NAME}`)
  console.log(`   Partidos creados: ${created} · omitidos: ${skipped}`)
  console.log(`   Admin: /kelme/admin/matches?season=${season.id}`)
}

async function main() {
  const parsed = parseCupSeedArgs(process.argv.slice(2))
  if (!parsed.ok) {
    console.error(parsed.error)
    process.exit(1)
  }
  const start = requireStartDate(parsed.value)
  if (!start.ok) {
    console.error(start.error)
    process.exit(1)
  }

  if (parsed.value.phase === 'grupos') {
    let organizationId = 'dry-run'
    if (!parsed.value.dryRun) {
      const { prisma } = getDb()
      const org = await prisma.organization.findUnique({ where: { slug: CUP_ORG_SLUG } })
      if (!org) {
        throw new Error('No existe la org kelme. Corre npm run db:ensure:kelme')
      }
      organizationId = org.id
    }
    await seedGrupos({
      organizationId,
      variant: parsed.value.variant,
      startDate: start.startDate,
      venue: parsed.value.venue,
      dryRun: parsed.value.dryRun,
      resetMatches: parsed.value.resetMatches,
    })
    return
  }

  console.log('Fase finales: implementar en Task 4')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect()
    if (pool) await pool.end()
  })

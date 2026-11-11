#!/usr/bin/env tsx
/**
 * Carga el fixture de la Kelme Cup Los Lagos 2026 (15 partidos, 2 categorías) en la organización
 * `kelme`. Es idempotente: reutiliza lo que ya existe y nunca pisa resultados cargados.
 *
 * Por defecto solo simula (dry-run). Para escribir en la base:
 *   npm run db:seed:kelme-fixture -- --apply
 */
import 'dotenv/config'
import { FootballFormat, MatchStatus, MatchType } from '@prisma/client'
import { createPrismaClient } from '../prisma/lib/db-client'
import {
  FIXTURE_DATE,
  FIXTURE_MATCHES,
  FIXTURE_TEAMS,
  fixtureEndAt,
  fixtureStartAt,
  serializeSlot,
  slotLabel,
} from '../src/lib/kelme-fixture/definition'
import { pickExistingTeam } from '../src/lib/kelme-fixture/setup'
import type { CategoryCode } from '../src/lib/kelme-fixture/types'
import { CUP_COMMUNE_CODE, CUP_REGION_CODE } from '../src/lib/copa-kelme-los-lagos'
import { buildMatchLocationFields } from '../src/lib/match-location'
import { BASIC_REFEREE_EVENT_TYPES } from '../src/lib/match-referee-event-presets'
import { deriveTeamColor } from '../src/lib/team-color'

const ORG_SLUG = 'kelme'
const SEASON_NAME = 'Kelme Cup Los Lagos 2026'
const VENUE = 'Canchas Colegio Puerto Varas'

const apply = process.argv.includes('--apply')
const log = (message: string) => console.log(`${apply ? '' : '[simulación] '}${message}`)

async function main() {
  const { prisma, pool } = createPrismaClient()

  try {
    const org = await prisma.organization.findFirst({ where: { slug: ORG_SLUG }, select: { id: true } })
    if (!org) throw new Error(`No existe la organización "${ORG_SLUG}".`)

    console.log(apply ? 'Modo APLICAR: se escribirá en la base de datos.' : 'Modo simulación: no se escribe nada (usa --apply).')

    // 1) Categorías
    const categoryByCode = new Map<CategoryCode, { id: string; name: string }>()
    for (const code of ['2019-2018', '2017-2016'] as const) {
      const year = code.slice(0, 4)
      const existing = await prisma.friendlyCategory.findFirst({
        where: { organizationId: org.id, name: { contains: year } },
        orderBy: { createdAt: 'asc' },
      })
      if (existing) {
        categoryByCode.set(code, { id: existing.id, name: existing.name })
        log(`Categoría existente: ${existing.name}`)
      } else {
        log(`Crear categoría ${code}`)
        if (apply) {
          const created = await prisma.friendlyCategory.create({
            data: { organizationId: org.id, name: code, isActive: true },
          })
          categoryByCode.set(code, { id: created.id, name: created.name })
        } else {
          categoryByCode.set(code, { id: `(nueva ${code})`, name: code })
        }
      }
    }

    // 2) Temporada
    let season = await prisma.season.findFirst({ where: { organizationId: org.id, name: SEASON_NAME } })
    if (season) {
      log(`Temporada existente: ${season.name}`)
    } else {
      log(`Crear temporada ${SEASON_NAME}`)
      if (apply) {
        season = await prisma.season.create({
          data: {
            organizationId: org.id,
            name: SEASON_NAME,
            startDate: new Date(`${FIXTURE_DATE}T00:00:00-03:00`),
            endDate: new Date(`${FIXTURE_DATE}T23:59:59-03:00`),
            footballFormat: FootballFormat.FUTBOL_7,
            isActive: true,
          },
        })
      }
    }

    // 3) Categorías de la temporada
    const seasonCategoryByCode = new Map<CategoryCode, string>()
    let order = 0
    for (const [code, category] of categoryByCode) {
      order += 1
      if (!season) {
        log(`Vincular categoría ${code} a la temporada`)
        continue
      }
      const existing = await prisma.seasonCategory.findFirst({
        where: { seasonId: season.id, categoryId: category.id },
      })
      if (existing) {
        seasonCategoryByCode.set(code, existing.id)
        continue
      }
      log(`Vincular categoría ${code} a la temporada`)
      if (apply) {
        const created = await prisma.seasonCategory.create({
          data: { seasonId: season.id, categoryId: category.id, sortOrder: order },
        })
        seasonCategoryByCode.set(code, created.id)
      }
    }

    // 4) Equipos (identidad = nombre + categoría)
    const orgTeams = await prisma.team.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, categoryId: true, createdAt: true },
    })
    const teamIdByKey = new Map<string, string>()
    let sortOrder = 0
    for (const def of FIXTURE_TEAMS) {
      sortOrder += 1
      const category = categoryByCode.get(def.category)!
      const { team, duplicates } = pickExistingTeam(orgTeams, def, category.id)
      if (duplicates.length > 0) {
        console.warn(
          `Aviso: ${def.name} (${def.category}) tiene duplicados (${duplicates.map((d) => d.id).join(', ')}). Se usa ${team?.id}.`,
        )
      }

      let teamId = team?.id ?? null
      if (!team) {
        log(`Crear equipo ${def.name} (${def.category})${def.provisional ? ' [provisional]' : ''}`)
        if (apply) {
          const created = await prisma.team.create({
            data: {
              organizationId: org.id,
              name: def.name,
              categoryId: category.id,
              color: deriveTeamColor(def.name),
            },
          })
          teamId = created.id
        }
      }
      if (!teamId) continue
      teamIdByKey.set(def.key, teamId)

      const seasonCategoryId = seasonCategoryByCode.get(def.category)
      if (!season || !seasonCategoryId) continue
      const enrollment = await prisma.seasonTeam.findFirst({ where: { seasonCategoryId, teamId } })
      if (!enrollment) {
        log(`Inscribir ${def.name} en ${def.category}${def.group ? ` · Grupo ${def.group}` : ''}`)
        if (apply) {
          await prisma.seasonTeam.create({
            data: {
              seasonId: season.id,
              seasonCategoryId,
              teamId,
              displayName: team?.name ?? def.name,
              status: 'REGISTERED',
              sortOrder,
              groupCode: def.group,
            },
          })
        }
      } else if (enrollment.groupCode !== def.group) {
        log(`Actualizar grupo de ${def.name}: ${enrollment.groupCode ?? '—'} → ${def.group ?? '—'}`)
        if (apply) {
          await prisma.seasonTeam.update({ where: { id: enrollment.id }, data: { groupCode: def.group } })
        }
      }
    }

    // 5) Partidos (M01–M15)
    const location = buildMatchLocationFields({ regionCode: CUP_REGION_CODE, communeCode: CUP_COMMUNE_CODE })
    for (const def of FIXTURE_MATCHES) {
      const existing = season
        ? await prisma.match.findFirst({ where: { seasonId: season.id, fixtureCode: def.code } })
        : null
      if (existing) {
        log(`${def.code} ya existe: se conserva (resultados intactos)`)
        continue
      }

      const startAt = fixtureStartAt(def)
      const homeName = def.homeKey ? FIXTURE_TEAMS.find((t) => t.key === def.homeKey)!.name : slotLabel(def.homeSlot!)
      const awayName = def.awayKey ? FIXTURE_TEAMS.find((t) => t.key === def.awayKey)!.name : slotLabel(def.awaySlot!)
      log(
        `Crear ${def.code} · ${def.startTime} · cancha ${def.court} · ${def.category} · ${homeName} vs ${awayName}`,
      )
      if (!apply || !season) continue

      await prisma.match.create({
        data: {
          organizationId: org.id,
          matchType: MatchType.LEAGUE,
          seasonId: season.id,
          seasonCategoryId: seasonCategoryByCode.get(def.category) ?? null,
          homeTeamId: def.homeKey ? (teamIdByKey.get(def.homeKey) ?? null) : null,
          awayTeamId: def.awayKey ? (teamIdByKey.get(def.awayKey) ?? null) : null,
          sideAName: def.homeSlot ? `Por definir (${slotLabel(def.homeSlot)})` : null,
          sideBName: def.awaySlot ? `Por definir (${slotLabel(def.awaySlot)})` : null,
          footballFormat: FootballFormat.FUTBOL_7,
          scheduledAt: startAt,
          endsAt: fixtureEndAt(startAt),
          venue: VENUE,
          ...location,
          status: MatchStatus.SCHEDULED,
          refereeEventTypes: BASIC_REFEREE_EVENT_TYPES,
          fixtureCode: def.code,
          phase: def.phase,
          groupCode: def.group,
          court: def.court,
          homeSlot: def.homeSlot ? serializeSlot(def.homeSlot) : null,
          awaySlot: def.awaySlot ? serializeSlot(def.awaySlot) : null,
        },
      })
    }

    console.log(apply ? '\nListo. Revisa /kelme/admin/fixture.' : '\nSimulación terminada. Repite con --apply para escribir.')
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

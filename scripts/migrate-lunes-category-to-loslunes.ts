#!/usr/bin/env tsx
/**
 * Mueve la categoría "Partido de los Lunes" (partidos + jugadores) a la org loslunes.
 * Jugadores que también están en otras categorías de Kelme se duplican en loslunes.
 *
 * Uso:
 *   npx tsx scripts/migrate-lunes-category-to-loslunes.ts --dry-run
 *   npx tsx scripts/migrate-lunes-category-to-loslunes.ts
 */
import 'dotenv/config'
import { db } from '@/lib/db'

const TARGET_SLUG = 'loslunes'
const CATEGORY_NAME = 'Partido de los Lunes'

async function ensureLoslunesPlayer(
  sourcePlayerId: string,
  loslunesOrgId: string,
): Promise<string> {
  const source = await db.player.findUniqueOrThrow({
    where: { id: sourcePlayerId },
    select: {
      personId: true,
      teamId: true,
      jerseyNumber: true,
      position: true,
      dominantFoot: true,
      primaryPosition: true,
      secondaryPosition: true,
    },
  })

  const existing = await db.player.findUnique({
    where: {
      personId_organizationId: {
        personId: source.personId,
        organizationId: loslunesOrgId,
      },
    },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await db.player.create({
    data: {
      organizationId: loslunesOrgId,
      personId: source.personId,
      teamId: null,
      jerseyNumber: source.jerseyNumber,
      position: source.position,
      dominantFoot: source.dominantFoot ?? undefined,
      primaryPosition: source.primaryPosition,
      secondaryPosition: source.secondaryPosition,
    },
    select: { id: true },
  })
  return created.id
}

async function reassignPlayerReferences(
  oldPlayerId: string,
  newPlayerId: string,
  matchIds: string[],
) {
  if (oldPlayerId === newPlayerId || matchIds.length === 0) return

  await db.friendlyMatchPlayer.updateMany({
    where: { matchId: { in: matchIds }, playerId: oldPlayerId },
    data: { playerId: newPlayerId },
  })
  await db.matchEvent.updateMany({
    where: { matchId: { in: matchIds }, playerId: oldPlayerId },
    data: { playerId: newPlayerId },
  })
  await db.matchEvent.updateMany({
    where: { matchId: { in: matchIds }, assistPlayerId: oldPlayerId },
    data: { assistPlayerId: newPlayerId },
  })
  await db.matchTeamMvp.updateMany({
    where: { matchId: { in: matchIds }, playerId: oldPlayerId },
    data: { playerId: newPlayerId },
  })
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const targetOrg = await db.organization.findUnique({ where: { slug: TARGET_SLUG } })
  if (!targetOrg) throw new Error(`Org /${TARGET_SLUG} no encontrada`)

  const category = await db.friendlyCategory.findFirst({
    where: { name: { equals: CATEGORY_NAME, mode: 'insensitive' } },
    include: {
      matches: { select: { id: true } },
      playerLinks: {
        include: {
          player: {
            include: {
              person: { select: { firstName: true, lastName: true } },
              categories: { select: { friendlyCategoryId: true } },
            },
          },
        },
      },
    },
  })

  if (!category) throw new Error(`Categoría "${CATEGORY_NAME}" no encontrada`)

  const matchIds = category.matches.map((m) => m.id)

  console.log(`Categoría: ${category.name} (${category.id})`)
  console.log(`Org actual: ${category.organizationId} → ${targetOrg.slug} (${targetOrg.id})`)
  console.log(`Partidos: ${matchIds.length}`)
  console.log(`Jugadores en categoría: ${category.playerLinks.length}`)
  if (dryRun) console.log('\n[DRY RUN] Sin cambios en DB\n')

  if (category.organizationId === targetOrg.id) {
    console.log('La categoría ya pertenece a loslunes. Verificando jugadores…')
  }

  for (const link of category.playerLinks) {
    const player = link.player
    const displayName = `${player.person.firstName} ${player.person.lastName}`.trim()
    const otherCategories = player.categories.filter(
      (c) => c.friendlyCategoryId !== category.id,
    )

    if (otherCategories.length === 0) {
      if (!dryRun && player.organizationId !== targetOrg.id) {
        await db.player.update({
          where: { id: player.id },
          data: { organizationId: targetOrg.id, teamId: null },
        })
      }
      console.log(`  ${displayName}: mover ficha → ${TARGET_SLUG}`)
      continue
    }

    const loslunesPlayerId = dryRun
      ? `(nuevo-${player.personId})`
      : await ensureLoslunesPlayer(player.id, targetOrg.id)

    if (!dryRun) {
      await db.playerCategory.delete({
        where: {
          playerId_friendlyCategoryId: {
            playerId: player.id,
            friendlyCategoryId: category.id,
          },
        },
      })
      await db.playerCategory.create({
        data: {
          playerId: loslunesPlayerId as string,
          friendlyCategoryId: category.id,
        },
      })
      await reassignPlayerReferences(player.id, loslunesPlayerId as string, matchIds)
    }
    console.log(
      `  ${displayName}: duplicar en ${TARGET_SLUG} (${otherCategories.length} cat. en otra org)`,
    )
  }

  if (!dryRun) {
    await db.match.updateMany({
      where: { friendlyCategoryId: category.id },
      data: { organizationId: targetOrg.id },
    })
    if (category.organizationId !== targetOrg.id) {
      await db.friendlyCategory.update({
        where: { id: category.id },
        data: { organizationId: targetOrg.id },
      })
    }
  }

  console.log(dryRun ? '\nDry run terminado.' : '\nMigración completada.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

#!/usr/bin/env tsx
/**
 * Mueve la categoría "Partido de los Lunes" (y sus partidos/jugadores) a la org loslunes.
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

type FriendlyPlayerRow = {
  id: string
  organizationId: string
  personId: string
  firstName: string
  lastName: string
  dominantFoot: string | null
  primaryPosition: string | null
  secondaryPosition: string | null
  photoMimeType: string | null
  photoData: Buffer | null
}

async function ensureLoslunesPlayer(
  source: FriendlyPlayerRow,
  loslunesOrgId: string,
): Promise<string> {
  const existing = await db.friendlyPlayer.findUnique({
    where: {
      personId_organizationId: {
        personId: source.personId,
        organizationId: loslunesOrgId,
      },
    },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await db.friendlyPlayer.create({
    data: {
      organizationId: loslunesOrgId,
      personId: source.personId,
      firstName: source.firstName,
      lastName: source.lastName,
      dominantFoot: source.dominantFoot as never,
      primaryPosition: source.primaryPosition,
      secondaryPosition: source.secondaryPosition,
      photoMimeType: source.photoMimeType,
      photoData: source.photoData,
    },
    select: { id: true },
  })
  return created.id
}

async function reassignPlayerReferences(oldPlayerId: string, newPlayerId: string, matchIds: string[]) {
  if (oldPlayerId === newPlayerId || matchIds.length === 0) return

  await db.friendlyMatchPlayer.updateMany({
    where: { matchId: { in: matchIds }, friendlyPlayerId: oldPlayerId },
    data: { friendlyPlayerId: newPlayerId },
  })
  await db.matchEvent.updateMany({
    where: { matchId: { in: matchIds }, friendlyPlayerId: oldPlayerId },
    data: { friendlyPlayerId: newPlayerId },
  })
  await db.matchEvent.updateMany({
    where: { matchId: { in: matchIds }, assistFriendlyPlayerId: oldPlayerId },
    data: { assistFriendlyPlayerId: newPlayerId },
  })
  await db.matchTeamMvp.updateMany({
    where: { matchId: { in: matchIds }, friendlyPlayerId: oldPlayerId },
    data: { friendlyPlayerId: newPlayerId },
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
      playerMemberships: {
        include: {
          friendlyPlayer: {
            include: { categories: { select: { friendlyCategoryId: true } } },
          },
        },
      },
    },
  })

  if (!category) throw new Error(`Categoría "${CATEGORY_NAME}" no encontrada`)

  const matchIds = category.matches.map((m) => m.id)
  const sourceOrgId = category.organizationId

  console.log(`Categoría: ${category.name} (${category.id})`)
  console.log(`Org actual: ${sourceOrgId} → ${targetOrg.slug} (${targetOrg.id})`)
  console.log(`Partidos: ${matchIds.length}`)
  console.log(`Membresías jugador: ${category.playerMemberships.length}`)
  if (dryRun) console.log('\n[DRY RUN] Sin cambios en DB\n')

  const playerIdMap = new Map<string, string>()

  for (const membership of category.playerMemberships) {
    const player = membership.friendlyPlayer
    const otherCategories = player.categories.filter((c) => c.friendlyCategoryId !== category.id)

    if (otherCategories.length === 0) {
      playerIdMap.set(player.id, player.id)
      if (!dryRun && player.organizationId !== targetOrg.id) {
        await db.friendlyPlayer.update({
          where: { id: player.id },
          data: { organizationId: targetOrg.id },
        })
      }
      console.log(`  jugador ${player.firstName} ${player.lastName}: mover ficha → ${TARGET_SLUG}`)
      continue
    }

    const loslunesPlayerId = dryRun
      ? `(nuevo-${player.personId})`
      : await ensureLoslunesPlayer(player, targetOrg.id)
    playerIdMap.set(player.id, typeof loslunesPlayerId === 'string' ? loslunesPlayerId : player.id)

    if (!dryRun) {
      await db.friendlyPlayerCategory.delete({
        where: {
          friendlyPlayerId_friendlyCategoryId: {
            friendlyPlayerId: player.id,
            friendlyCategoryId: category.id,
          },
        },
      })
      await db.friendlyPlayerCategory.create({
        data: {
          friendlyPlayerId: loslunesPlayerId as string,
          friendlyCategoryId: category.id,
        },
      })
      await reassignPlayerReferences(player.id, loslunesPlayerId as string, matchIds)
    }
    console.log(
      `  jugador ${player.firstName} ${player.lastName}: duplicar en ${TARGET_SLUG} (${otherCategories.length} cat. en Kelme)`,
    )
  }

  if (!dryRun) {
    await db.match.updateMany({
      where: { friendlyCategoryId: category.id },
      data: { organizationId: targetOrg.id },
    })
    await db.friendlyCategory.update({
      where: { id: category.id },
      data: { organizationId: targetOrg.id },
    })
  }

  console.log(dryRun ? '\nDry run terminado.' : '\nMigración completada.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

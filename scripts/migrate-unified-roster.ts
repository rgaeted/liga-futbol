#!/usr/bin/env tsx
/**
 * Migra FriendlyPlayer → Player (roster unificado por org).
 * Requiere migración 20260820120000_unified_roster aplicada (columnas aditivas).
 *
 * Uso:
 *   npx tsx scripts/migrate-unified-roster.ts --dry-run
 *   npx tsx scripts/migrate-unified-roster.ts
 */
import 'dotenv/config'
import { db } from '@/lib/db'

type Stats = {
  friendlyPlayers: number
  playersCreated: number
  playersReused: number
  categoriesCopied: number
  participationsUpdated: number
  eventsPlayerUpdated: number
  eventsAssistUpdated: number
  mvpsUpdated: number
  photosCopied: number
}

async function findOrCreatePlayer(
  fp: {
    id: string
    organizationId: string
    personId: string
    dominantFoot: string | null
    primaryPosition: string | null
    secondaryPosition: string | null
    photoMimeType: string | null
    photoData: Buffer | null
    person: { photoMimeType: string | null; photoData: Buffer | null }
  },
  dryRun: boolean,
  stats: Stats,
): Promise<string> {
  const existing = await db.player.findUnique({
    where: {
      personId_organizationId: {
        personId: fp.personId,
        organizationId: fp.organizationId,
      },
    },
    select: {
      id: true,
      dominantFoot: true,
      primaryPosition: true,
      secondaryPosition: true,
    },
  })

  if (existing) {
    stats.playersReused++
    if (!dryRun) {
      await db.player.update({
        where: { id: existing.id },
        data: {
          dominantFoot: existing.dominantFoot ?? (fp.dominantFoot as never),
          primaryPosition: existing.primaryPosition ?? fp.primaryPosition,
          secondaryPosition: existing.secondaryPosition ?? fp.secondaryPosition,
        },
      })
    }
    return existing.id
  }

  stats.playersCreated++
  if (dryRun) return `(new-player-${fp.personId})`

  const created = await db.player.create({
    data: {
      organizationId: fp.organizationId,
      personId: fp.personId,
      dominantFoot: fp.dominantFoot as never,
      primaryPosition: fp.primaryPosition,
      secondaryPosition: fp.secondaryPosition,
    },
    select: { id: true },
  })
  return created.id
}

async function copyPersonPhotoIfEmpty(
  personId: string,
  photoMimeType: string | null,
  photoData: Buffer | null,
  dryRun: boolean,
  stats: Stats,
) {
  if (!photoData || !photoMimeType) return

  const person = await db.person.findUnique({
    where: { id: personId },
    select: { photoData: true },
  })
  if (person?.photoData) return

  stats.photosCopied++
  if (!dryRun) {
    await db.person.update({
      where: { id: personId },
      data: { photoMimeType, photoData },
    })
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const stats: Stats = {
    friendlyPlayers: 0,
    playersCreated: 0,
    playersReused: 0,
    categoriesCopied: 0,
    participationsUpdated: 0,
    eventsPlayerUpdated: 0,
    eventsAssistUpdated: 0,
    mvpsUpdated: 0,
    photosCopied: 0,
  }

  if (dryRun) console.log('[DRY RUN] Sin cambios en DB\n')

  const friendlyPlayers = await db.friendlyPlayer.findMany({
    include: {
      categories: true,
      person: { select: { photoMimeType: true, photoData: true } },
    },
  })
  stats.friendlyPlayers = friendlyPlayers.length

  const fpToPlayer = new Map<string, string>()

  for (const fp of friendlyPlayers) {
    const playerId = await findOrCreatePlayer(fp, dryRun, stats)
    fpToPlayer.set(fp.id, playerId)

    await copyPersonPhotoIfEmpty(
      fp.personId,
      fp.photoMimeType,
      fp.photoData,
      dryRun,
      stats,
    )

    for (const cat of fp.categories) {
      stats.categoriesCopied++
      if (!dryRun && !playerId.startsWith('(new-')) {
        await db.playerCategory.upsert({
          where: {
            playerId_friendlyCategoryId: {
              playerId,
              friendlyCategoryId: cat.friendlyCategoryId,
            },
          },
          create: {
            playerId,
            friendlyCategoryId: cat.friendlyCategoryId,
          },
          update: {},
        })
      }
    }
  }

  for (const [friendlyPlayerId, playerId] of fpToPlayer) {
    if (dryRun || playerId.startsWith('(new-')) continue

    const participations = await db.friendlyMatchPlayer.updateMany({
      where: { friendlyPlayerId, playerId: null },
      data: { playerId },
    })
    stats.participationsUpdated += participations.count

    const eventsPlayer = await db.matchEvent.updateMany({
      where: { friendlyPlayerId, playerId: null },
      data: { playerId },
    })
    stats.eventsPlayerUpdated += eventsPlayer.count

    const eventsAssist = await db.matchEvent.updateMany({
      where: { assistFriendlyPlayerId: friendlyPlayerId, assistPlayerId: null },
      data: { assistPlayerId: playerId },
    })
    stats.eventsAssistUpdated += eventsAssist.count

    const mvps = await db.matchTeamMvp.updateMany({
      where: { friendlyPlayerId, playerId: null },
      data: { playerId },
    })
    stats.mvpsUpdated += mvps.count
  }

  console.log('Unified roster migration summary:')
  console.log(`  friendlyPlayers=${stats.friendlyPlayers}`)
  console.log(`  playersCreated=${stats.playersCreated}`)
  console.log(`  playersReused=${stats.playersReused}`)
  console.log(`  categoriesCopied=${stats.categoriesCopied}`)
  console.log(`  participationsUpdated=${stats.participationsUpdated}`)
  console.log(`  eventsPlayerUpdated=${stats.eventsPlayerUpdated}`)
  console.log(`  eventsAssistUpdated=${stats.eventsAssistUpdated}`)
  console.log(`  mvpsUpdated=${stats.mvpsUpdated}`)
  console.log(`  photosCopied=${stats.photosCopied}`)
  console.log(dryRun ? '\nDry run terminado.' : '\nMigración completada.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

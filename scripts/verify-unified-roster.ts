#!/usr/bin/env tsx
/**
 * Verifica integridad del roster unificado y opcionalmente colapsa duplicados (matchId, playerId).
 *
 * Uso:
 *   npx tsx scripts/verify-unified-roster.ts
 *   npx tsx scripts/verify-unified-roster.ts --collapse
 */
import 'dotenv/config'
import { db } from '@/lib/db'
import {
  duplicateParticipationGroups,
  pickParticipationWinner,
} from '@/lib/unified-roster-map'

type VerifyResult = {
  ok: boolean
  nullPlayerIdParticipations: number
  duplicateParticipationGroups: number
  eventsMissingPlayerId: number
  assistEventsMissingPlayerId: number
  mvpsMissingPlayerId: number
  friendlyPlayersWithoutPlayer: number
}

async function collapseDuplicateParticipations(dryRun: boolean): Promise<number> {
  const participations = await db.friendlyMatchPlayer.findMany({
    where: { playerId: { not: null } },
    select: {
      id: true,
      matchId: true,
      playerId: true,
      paid: true,
      isGalleta: true,
      isCaptain: true,
      isCoach: true,
    },
  })

  const duplicateGroups = duplicateParticipationGroups(participations)
  let deleted = 0

  for (const [, rows] of duplicateGroups) {
    const winner = pickParticipationWinner(rows)
    const loserIds = rows.filter((r) => r.id !== winner.id).map((r) => r.id)
    if (loserIds.length === 0) continue

    deleted += loserIds.length
    if (!dryRun) {
      await db.friendlyMatchPlayer.deleteMany({ where: { id: { in: loserIds } } })
    }
  }

  return deleted
}

async function verify(): Promise<VerifyResult> {
  const nullPlayerIdParticipations = await db.friendlyMatchPlayer.count({
    where: { playerId: null },
  })

  const participations = await db.friendlyMatchPlayer.findMany({
    where: { playerId: { not: null } },
    select: { id: true, matchId: true, playerId: true },
  })
  const duplicateParticipationGroupCount = duplicateParticipationGroups(participations).size

  const eventsMissingPlayerId = await db.matchEvent.count({
    where: {
      friendlyPlayerId: { not: null },
      playerId: null,
    },
  })

  const assistEventsMissingPlayerId = await db.matchEvent.count({
    where: {
      assistFriendlyPlayerId: { not: null },
      assistPlayerId: null,
    },
  })

  const mvpsMissingPlayerId = await db.matchTeamMvp.count({
    where: {
      friendlyPlayerId: { not: null },
      playerId: null,
    },
  })

  const friendlyPlayers = await db.friendlyPlayer.findMany({
    select: { personId: true, organizationId: true },
  })
  let friendlyPlayersWithoutPlayer = 0
  for (const fp of friendlyPlayers) {
    const player = await db.player.findUnique({
      where: {
        personId_organizationId: {
          personId: fp.personId,
          organizationId: fp.organizationId,
        },
      },
      select: { id: true },
    })
    if (!player) friendlyPlayersWithoutPlayer++
  }

  const ok =
    nullPlayerIdParticipations === 0 &&
    duplicateParticipationGroupCount === 0 &&
    eventsMissingPlayerId === 0 &&
    assistEventsMissingPlayerId === 0 &&
    mvpsMissingPlayerId === 0 &&
    friendlyPlayersWithoutPlayer === 0

  return {
    ok,
    nullPlayerIdParticipations,
    duplicateParticipationGroups: duplicateParticipationGroupCount,
    eventsMissingPlayerId,
    assistEventsMissingPlayerId,
    mvpsMissingPlayerId,
    friendlyPlayersWithoutPlayer,
  }
}

function printResult(label: string, result: VerifyResult) {
  console.log(`${label}:`)
  console.log(`  nullPlayerIdParticipations=${result.nullPlayerIdParticipations}`)
  console.log(`  duplicateParticipationGroups=${result.duplicateParticipationGroups}`)
  console.log(`  eventsMissingPlayerId=${result.eventsMissingPlayerId}`)
  console.log(`  assistEventsMissingPlayerId=${result.assistEventsMissingPlayerId}`)
  console.log(`  mvpsMissingPlayerId=${result.mvpsMissingPlayerId}`)
  console.log(`  friendlyPlayersWithoutPlayer=${result.friendlyPlayersWithoutPlayer}`)
  console.log(`  status=${result.ok ? 'OK' : 'FAIL'}`)
}

async function main() {
  const collapse = process.argv.includes('--collapse')
  const dryRun = process.argv.includes('--dry-run')

  if (collapse) {
    const removed = await collapseDuplicateParticipations(dryRun)
    console.log(
      dryRun
        ? `[DRY RUN] would remove ${removed} duplicate participation row(s)`
        : `Removed ${removed} duplicate participation row(s)`,
    )
  }

  const result = await verify()
  printResult('\nVerify unified roster', result)

  if (!result.ok) {
    process.exit(1)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

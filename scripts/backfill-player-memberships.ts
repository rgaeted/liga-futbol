#!/usr/bin/env node
import 'dotenv/config'
import { syncAllPlayerDerivedMemberships } from '@/lib/player-memberships'
import { db } from '@/lib/db'

async function main() {
  const result = await syncAllPlayerDerivedMemberships()
  console.log(`[backfill-player-memberships] synced ${result.users} users`)
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[backfill-player-memberships] ERROR: ${message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })

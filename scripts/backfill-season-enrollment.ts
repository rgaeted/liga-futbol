#!/usr/bin/env tsx
import { db } from '@/lib/db'
import { backfillSeasonEnrollment } from '@/lib/mobile/enrollment-backfill'

async function main() {
  const summary = await backfillSeasonEnrollment(db)
  console.log('Backfill completado:', summary)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

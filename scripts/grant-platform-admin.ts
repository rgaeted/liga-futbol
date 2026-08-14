#!/usr/bin/env tsx
import { db } from '@/lib/db'

const email = process.argv[2]
if (!email) {
  console.error('Uso: npx tsx scripts/grant-platform-admin.ts email@dominio.cl')
  process.exit(1)
}

await db.user.update({ where: { email }, data: { isPlatformAdmin: true } })
console.log('Platform admin:', email)

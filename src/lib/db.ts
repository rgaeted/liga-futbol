import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { getRuntimeDatabaseConfig } from '@/lib/database-env'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  pool?: Pool
}

function createPrismaClient() {
  const runtime = getRuntimeDatabaseConfig()
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString: runtime.connectionString,
      ...runtime.pool,
    })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool
  }

  return new PrismaClient({
    adapter: new PrismaPg(pool),
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

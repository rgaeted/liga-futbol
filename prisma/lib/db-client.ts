import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { requireDirectDatabaseUrl } from '../../src/lib/database-env'

export function createPrismaClient() {
  const pool = new Pool({
    connectionString: requireDirectDatabaseUrl(),
    max: 1,
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })
  return { prisma, pool }
}

/** Prefijo de IDs y dominio de emails para datos de prueba eliminables */
export const DEMO_ID_PREFIX = 'demo-'
export const DEMO_EMAIL_DOMAIN = '@demo.torneoskelme.cl'
export const DEMO_PASSWORD = 'password123'

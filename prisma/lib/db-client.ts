import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

export function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })
  return { prisma, pool }
}

/** Prefijo de IDs y dominio de emails para datos de prueba eliminables */
export const DEMO_ID_PREFIX = 'demo-'
export const DEMO_EMAIL_DOMAIN = '@demo.torneoskelme.cl'
export const DEMO_PASSWORD = 'password123'

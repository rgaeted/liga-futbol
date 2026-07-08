import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@liga.com' },
    update: {},
    create: {
      email: 'admin@liga.com',
      name: 'Admin Liga',
      passwordHash,
      role: Role.ADMIN,
    },
  })

  const team = await prisma.team.upsert({
    where: { id: 'seed-team-1' },
    update: { name: 'Kelme FC' },
    create: {
      id: 'seed-team-1',
      name: 'Kelme FC',
    },
  })

  const coach = await prisma.user.upsert({
    where: { email: 'dt@liga.com' },
    update: {},
    create: {
      email: 'dt@liga.com',
      name: 'Director Técnico',
      passwordHash,
      role: Role.COACH,
    },
  })

  await prisma.team.update({
    where: { id: team.id },
    data: { coachId: coach.id },
  })

  const playerUser = await prisma.user.upsert({
    where: { email: 'jugador@liga.com' },
    update: {},
    create: {
      email: 'jugador@liga.com',
      name: 'Juan Pérez',
      passwordHash,
      role: Role.PLAYER,
    },
  })

  await prisma.player.upsert({
    where: { userId: playerUser.id },
    update: {},
    create: {
      userId: playerUser.id,
      teamId: team.id,
      jerseyNumber: 10,
      position: 'Delantero',
    },
  })

  await prisma.user.upsert({
    where: { email: 'arbitro@liga.com' },
    update: {},
    create: {
      email: 'arbitro@liga.com',
      name: 'Árbitro Principal',
      passwordHash,
      role: Role.REFEREE,
    },
  })

  console.log('Seed OK:', { admin: admin.email })
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })

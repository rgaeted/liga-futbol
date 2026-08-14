import 'dotenv/config'
import { MembershipRole, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { requireDirectDatabaseUrl } from '../src/lib/database-env'

const pool = new Pool({
  connectionString: requireDirectDatabaseUrl(),
  max: 1,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function upsertMembershipUser(
  email: string,
  name: string,
  role: MembershipRole,
  organizationId: string,
  passwordHash: string,
  isPlatformAdmin = false,
) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, isPlatformAdmin },
    create: { email, name, passwordHash, isPlatformAdmin },
  })
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: { organizationId, userId: user.id },
    },
    update: { role },
    create: { organizationId, userId: user.id, role },
  })
  return user
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  const kelmeOrg = await prisma.organization.upsert({
    where: { slug: 'kelme' },
    update: { name: 'Torneos Kelme' },
    create: {
      id: 'org_kelme',
      slug: 'kelme',
      name: 'Torneos Kelme',
      primaryColor: '#CD212A',
      secondaryColor: '#FFFFFF',
    },
  })

  const admin = await upsertMembershipUser(
    'admin@liga.com',
    'Admin Liga',
    MembershipRole.ORG_ADMIN,
    kelmeOrg.id,
    passwordHash,
    true,
  )

  const team = await prisma.team.upsert({
    where: { id: 'seed-team-1' },
    update: { name: 'Kelme FC', organizationId: kelmeOrg.id },
    create: {
      id: 'seed-team-1',
      name: 'Kelme FC',
      organizationId: kelmeOrg.id,
    },
  })

  const coach = await upsertMembershipUser(
    'dt@liga.com',
    'Director Técnico',
    MembershipRole.COACH,
    kelmeOrg.id,
    passwordHash,
  )

  await prisma.team.update({
    where: { id: team.id },
    data: { coachId: coach.id },
  })

  const playerUser = await upsertMembershipUser(
    'jugador@liga.com',
    'Juan Pérez',
    MembershipRole.PLAYER,
    kelmeOrg.id,
    passwordHash,
  )

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

  await upsertMembershipUser(
    'arbitro@liga.com',
    'Árbitro Principal',
    MembershipRole.REFEREE,
    kelmeOrg.id,
    passwordHash,
  )

  console.log('Seed OK:', { admin: admin.email, organization: kelmeOrg.slug })
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })

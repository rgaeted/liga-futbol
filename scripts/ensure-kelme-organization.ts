#!/usr/bin/env tsx
/**
 * Asegura la organización Kelme y reasigna a ella todo dato legacy sin organizationId.
 * Idempotente: no mueve filas que ya pertenecen a otra org (ej. liga-demo).
 *
 * Uso: npm run db:ensure:kelme
 */
import 'dotenv/config'
import { db } from '@/lib/db'

const KELME_ID = 'org_kelme'
const KELME_SLUG = 'kelme'

async function backfillNullOrg(
  model: string,
  count: () => Promise<number>,
  update: () => Promise<{ count: number }>,
) {
  const before = await count()
  if (before === 0) {
    console.log(`  ${model}: ok (0 sin org)`)
    return 0
  }
  const result = await update()
  console.log(`  ${model}: ${result.count} filas → kelme`)
  return result.count
}

async function main() {
  console.log('🏢 Asegurando organización Kelme…\n')

  const kelme = await db.organization.upsert({
    where: { slug: KELME_SLUG },
    update: {
      name: 'Torneos Kelme',
      primaryColor: '#CD212A',
      secondaryColor: '#FFFFFF',
      status: 'ACTIVE',
    },
    create: {
      id: KELME_ID,
      slug: KELME_SLUG,
      name: 'Torneos Kelme',
      primaryColor: '#CD212A',
      secondaryColor: '#FFFFFF',
      status: 'ACTIVE',
    },
  })

  console.log(`Organización: ${kelme.name} (/${kelme.slug}, id=${kelme.id})\nBackfill:`)

  let total = 0
  total += await backfillNullOrg(
    'Season',
    () => db.season.count({ where: { organizationId: null } }),
    () => db.season.updateMany({ where: { organizationId: null }, data: { organizationId: kelme.id } }),
  )
  total += await backfillNullOrg(
    'Team',
    () => db.team.count({ where: { organizationId: null } }),
    () => db.team.updateMany({ where: { organizationId: null }, data: { organizationId: kelme.id } }),
  )
  total += await backfillNullOrg(
    'Player',
    () => db.player.count({ where: { organizationId: null } }),
    () => db.player.updateMany({ where: { organizationId: null }, data: { organizationId: kelme.id } }),
  )
  total += await backfillNullOrg(
    'Match',
    () => db.match.count({ where: { organizationId: null } }),
    () => db.match.updateMany({ where: { organizationId: null }, data: { organizationId: kelme.id } }),
  )
  total += await backfillNullOrg(
    'FriendlyCategory',
    () => db.friendlyCategory.count({ where: { organizationId: null } }),
    () =>
      db.friendlyCategory.updateMany({
        where: { organizationId: null },
        data: { organizationId: kelme.id },
      }),
  )
  total += await backfillNullOrg(
    'FriendlyPlayer',
    () => db.friendlyPlayer.count({ where: { organizationId: null } }),
    () =>
      db.friendlyPlayer.updateMany({
        where: { organizationId: null },
        data: { organizationId: kelme.id },
      }),
  )
  total += await backfillNullOrg(
    'Article',
    () => db.article.count({ where: { organizationId: null } }),
    () => db.article.updateMany({ where: { organizationId: null }, data: { organizationId: kelme.id } }),
  )
  total += await backfillNullOrg(
    'Gallery',
    () => db.gallery.count({ where: { organizationId: null } }),
    () => db.gallery.updateMany({ where: { organizationId: null }, data: { organizationId: kelme.id } }),
  )
  total += await backfillNullOrg(
    'Sponsor',
    () => db.sponsor.count({ where: { organizationId: null } }),
    () => db.sponsor.updateMany({ where: { organizationId: null }, data: { organizationId: kelme.id } }),
  )

  const [friendlyMatches, friendlyPlayers, categories, members] = await Promise.all([
    db.match.count({ where: { organizationId: kelme.id, matchType: 'FRIENDLY' } }),
    db.friendlyPlayer.count({ where: { organizationId: kelme.id } }),
    db.friendlyCategory.count({ where: { organizationId: kelme.id } }),
    db.organizationMembership.count({ where: { organizationId: kelme.id } }),
  ])

  console.log(`\n✅ Kelme listo (${total} filas reasignadas)`)
  console.log(`   Amistosos: ${friendlyMatches} partidos, ${friendlyPlayers} jugadores, ${categories} categorías`)
  console.log(`   Membresías: ${members}`)
}

void main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })

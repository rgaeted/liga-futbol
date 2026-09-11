#!/usr/bin/env tsx
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SeasonTeamStatus, type PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import type { Pool } from 'pg'
import { CUP_ORG_SLUG, CUP_SEASON_NAME } from '../src/lib/copa-kelme-los-lagos'
import { validateEditorialImage } from '../src/lib/editorial/image'
import { editorialStorageBucket } from '../src/lib/editorial/urls'
import {
  KELME_CUP_MOBILE_DISPLAY_NAME,
  KELME_CUP_MOBILE_SHORT_NAME,
  KELME_CUP_MOBILE_SLUG,
  assertKelmeCupMobilePublishReady,
  kelmeCupMobileDescription,
  kelmeCupMobileLogoStoragePath,
} from '../src/lib/kelme-cup-mobile-edition'
import { KELME_CUP_PRIMARY, KELME_CUP_SECONDARY } from '../src/lib/org-brand'

let prisma: PrismaClient
let pool: Pool

function getDb() {
  if (!prisma) {
    const mod = require('../prisma/lib/db-client') as typeof import('../prisma/lib/db-client')
    const client = mod.createPrismaClient()
    prisma = client.prisma
    pool = client.pool
  }
  return { prisma, pool }
}

async function uploadLogo(storagePath: string, buffer: Buffer, mimeType: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    throw new Error('Supabase no configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)')
  }
  const supabase = createClient(url, secretKey)
  const { error } = await supabase.storage.from(editorialStorageBucket()).upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: true,
  })
  if (error) throw error
}

async function main() {
  const { prisma, pool } = getDb()
  try {
    const org = await prisma.organization.findUnique({ where: { slug: CUP_ORG_SLUG } })
    if (!org) {
      throw new Error(`No existe la org "${CUP_ORG_SLUG}".`)
    }

    const season = await prisma.season.findFirst({
      where: { organizationId: org.id, name: CUP_SEASON_NAME },
    })
    if (!season) {
      throw new Error(
        `No existe la temporada "${CUP_SEASON_NAME}". Corre: npm run db:seed:copa-kelme-los-lagos`,
      )
    }

    const registeredTeamCount = await prisma.seasonTeam.count({
      where: { seasonId: season.id, status: SeasonTeamStatus.REGISTERED },
    })
    if (registeredTeamCount < 1) {
      throw new Error('Debes inscribir al menos un equipo antes de publicar')
    }

    const existing = await prisma.seasonMobileConfig.findUnique({ where: { seasonId: season.id } })
    if (existing && existing.slug !== KELME_CUP_MOBILE_SLUG) {
      throw new Error(`El slug no se puede cambiar después (actual: ${existing.slug})`)
    }

    const taken = await prisma.seasonMobileConfig.findUnique({
      where: { slug: KELME_CUP_MOBILE_SLUG },
    })
    if (taken && taken.seasonId !== season.id) {
      throw new Error(`El slug ${KELME_CUP_MOBILE_SLUG} ya pertenece a otra temporada`)
    }

    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const shieldPath = path.join(repoRoot, 'public', 'branding', 'kelme-cup-shield.png')
    const buffer = await readFile(shieldPath)
    const mimeType = 'image/png'
    const validation = validateEditorialImage(buffer, mimeType)
    if (!validation.ok) throw new Error(validation.error)

    const logoStoragePath = kelmeCupMobileLogoStoragePath(season.id)
    await prisma.seasonMobileConfig.upsert({
      where: { seasonId: season.id },
      create: {
        seasonId: season.id,
        slug: KELME_CUP_MOBILE_SLUG,
        displayName: KELME_CUP_MOBILE_DISPLAY_NAME,
        shortName: KELME_CUP_MOBILE_SHORT_NAME,
        description: kelmeCupMobileDescription(),
        primaryColor: KELME_CUP_PRIMARY,
        secondaryColor: KELME_CUP_SECONDARY,
        isPublished: false,
      },
      update: {
        displayName: KELME_CUP_MOBILE_DISPLAY_NAME,
        shortName: KELME_CUP_MOBILE_SHORT_NAME,
        description: kelmeCupMobileDescription(),
        primaryColor: KELME_CUP_PRIMARY,
        secondaryColor: KELME_CUP_SECONDARY,
      },
    })

    await uploadLogo(logoStoragePath, buffer, mimeType)
    await prisma.seasonMobileConfig.update({
      where: { seasonId: season.id },
      data: { logoStoragePath },
    })

    const ready = assertKelmeCupMobilePublishReady({
      registeredTeamCount,
      logoStoragePath,
    })
    if (!ready.ok) throw new Error(ready.error)

    const now = new Date()
    const published = await prisma.seasonMobileConfig.update({
      where: { seasonId: season.id },
      data: {
        isPublished: true,
        publishedAt: existing?.publishedAt ?? now,
      },
    })

    console.log(`Publicada ${published.slug} para temporada ${season.id}`)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

#!/usr/bin/env tsx
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '@/lib/db'
import { applyMobileEditionScaffold } from '@/lib/mobile-edition-scaffold'

const slug = process.argv.find((a) => a.startsWith('--slug='))?.slice(7)
const force = process.argv.includes('--force')

if (!slug) {
  console.error('Uso: npx tsx scripts/create-mobile-edition.ts --slug=<slug> [--force]')
  process.exit(1)
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function copyDir(from: string, to: string) {
  await fs.mkdir(to, { recursive: true })
  const entries = await fs.readdir(from, { withFileTypes: true })
  for (const entry of entries) {
    const src = path.join(from, entry.name)
    const dest = path.join(to, entry.name)
    if (entry.isDirectory()) {
      await copyDir(src, dest)
    } else {
      await fs.copyFile(src, dest)
    }
  }
}

const config = await db.seasonMobileConfig.findUnique({
  where: { slug },
  include: { season: { include: { organization: true } } },
})

if (!config) {
  console.error(`No existe SeasonMobileConfig con slug "${slug}"`)
  process.exit(1)
}

const apiBaseUrl = process.env.PUBLIC_APP_URL ?? 'https://torneos-kelme.vercel.app'
const primaryColor = config.primaryColor ?? config.season.organization.primaryColor
const secondaryColor = config.secondaryColor ?? config.season.organization.secondaryColor

try {
  await applyMobileEditionScaffold({
    slug,
    force,
    repoRoot,
    config: {
      slug: config.slug,
      displayName: config.displayName,
      shortName: config.shortName ?? config.displayName,
      organizationSlug: config.season.organization.slug,
      seasonId: config.seasonId,
      primaryColor,
      secondaryColor,
      apiBaseUrl,
    },
    files: {
      exists: async (p) => {
        try {
          await fs.access(p)
          return true
        } catch {
          return false
        }
      },
      mkdir: (p, options) => fs.mkdir(p, options),
      copyDir,
      writeFile: (p, content) => fs.writeFile(p, content, 'utf8'),
      readFile: (p) => fs.readFile(p, 'utf8'),
    },
  })
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

console.log(`Edición Expo creada: apps/mobile/editions/${slug}`)
console.log(`EDITION=${slug} npx eas build --platform ios`)
console.log(`EDITION=${slug} npx eas build --platform android`)
console.log('Sigue docs/operations/mobile-edition.md')

await db.$disconnect()

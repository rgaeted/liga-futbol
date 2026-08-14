import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { applyMobileEditionScaffold, editionIndexPatch } from '@/lib/mobile-edition-scaffold'

describe('applyMobileEditionScaffold', () => {
  it('writes edition config and patches edition.ts in a temp repo', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mobile-edition-'))

    const editionTs = `import puertoVaras2026 from '../../editions/liga-invierno-kelme-puerto-varas-2026/edition.config'

const EDITIONS: Record<string, EditionConfig> = {
  [puertoVaras2026.key]: puertoVaras2026,
}
`
    const pilotAssets = path.join(
      root,
      'apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026/assets',
    )
    await fs.mkdir(pilotAssets, { recursive: true })
    await fs.writeFile(path.join(pilotAssets, 'icon.png'), 'icon')
    await fs.mkdir(path.join(root, 'apps/mobile/src/lib'), { recursive: true })
    await fs.writeFile(path.join(root, 'apps/mobile/src/lib/edition.ts'), editionTs)

    await applyMobileEditionScaffold({
      slug: 'kelme-verano-2027',
      force: false,
      repoRoot: root,
      config: {
        slug: 'kelme-verano-2027',
        displayName: 'Kelme Verano 2027',
        shortName: 'Kelme 2027',
        organizationSlug: 'kelme',
        seasonId: 'season-1',
        primaryColor: '#CD212A',
        secondaryColor: '#FFFFFF',
        apiBaseUrl: 'https://torneos-kelme.vercel.app',
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
        copyDir: async (from, to) => {
          await fs.mkdir(to, { recursive: true })
          const entries = await fs.readdir(from)
          for (const entry of entries) {
            await fs.copyFile(path.join(from, entry), path.join(to, entry))
          }
        },
        writeFile: (p, content) => fs.writeFile(p, content, 'utf8'),
        readFile: (p) => fs.readFile(p, 'utf8'),
      },
    })

    const configSource = await fs.readFile(
      path.join(root, 'apps/mobile/editions/kelme-verano-2027/edition.config.ts'),
      'utf8',
    )
    expect(configSource).toContain("key: 'kelme-verano-2027'")

    const icon = await fs.readFile(
      path.join(root, 'apps/mobile/editions/kelme-verano-2027/assets/icon.png'),
    )
    expect(icon.toString()).toBe('icon')

    const patched = await fs.readFile(path.join(root, 'apps/mobile/src/lib/edition.ts'), 'utf8')
    expect(patched).toContain('kelmeVerano2027')
    expect(editionIndexPatch(patched, 'kelme-verano-2027')).toBe(patched)
  })

  it('throws when edition folder already exists', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mobile-edition-dup-'))
    const editionDir = path.join(root, 'apps/mobile/editions/kelme-verano-2027')
    await fs.mkdir(editionDir, { recursive: true })

    await expect(
      applyMobileEditionScaffold({
        slug: 'kelme-verano-2027',
        force: false,
        repoRoot: root,
        config: {
          slug: 'kelme-verano-2027',
          displayName: 'Kelme Verano 2027',
          shortName: 'Kelme 2027',
          organizationSlug: 'kelme',
          seasonId: 'season-1',
          primaryColor: '#CD212A',
          secondaryColor: '#FFFFFF',
          apiBaseUrl: 'https://torneos-kelme.vercel.app',
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
          copyDir: async () => undefined,
          writeFile: (p, content) => fs.writeFile(p, content, 'utf8'),
          readFile: (p) => fs.readFile(p, 'utf8'),
        },
      }),
    ).rejects.toThrow('La carpeta de edición ya existe')
  })
})

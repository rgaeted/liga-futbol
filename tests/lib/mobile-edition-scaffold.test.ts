import { describe, expect, it } from 'vitest'
import { buildEditionConfigSource, editionFolderName } from '@/lib/mobile-edition-scaffold'

describe('buildEditionConfigSource', () => {
  it('emits edition.config.ts with slug and bundle preview', () => {
    const source = buildEditionConfigSource({
      slug: 'kelme-verano-2027',
      displayName: 'Kelme Verano 2027',
      shortName: 'Kelme 2027',
      organizationSlug: 'kelme',
      seasonId: 'season-1',
      primaryColor: '#CD212A',
      secondaryColor: '#FFFFFF',
      apiBaseUrl: 'https://torneos-kelme.vercel.app',
    })
    expect(source).toContain("key: 'kelme-verano-2027'")
    expect(source).toContain('cl.admintorneo.kelme.')
    expect(source).toContain('seasonId: season-1')
    expect(editionFolderName('kelme-verano-2027')).toBe('kelme-verano-2027')
  })
})

describe('editionIndexPatch', () => {
  it('is idempotent', async () => {
    const { editionIndexPatch } = await import('@/lib/mobile-edition-scaffold')
    const sample = `import puertoVaras2026 from '../../editions/liga-invierno-kelme-puerto-varas-2026/edition.config'

const EDITIONS: Record<string, EditionConfig> = {
  [puertoVaras2026.key]: puertoVaras2026,
}
`
    const once = editionIndexPatch(sample, 'kelme-verano-2027')
    const twice = editionIndexPatch(once, 'kelme-verano-2027')
    expect(twice).toBe(once)
    expect(once).toContain("import kelmeVerano2027 from '../../editions/kelme-verano-2027/edition.config'")
    expect(once).toContain('[kelmeVerano2027.key]: kelmeVerano2027')
  })
})

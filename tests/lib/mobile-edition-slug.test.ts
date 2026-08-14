import { describe, expect, it } from 'vitest'
import { parseMobileEditionSlug } from '@/lib/mobile-edition-slug'
import { RESERVED_ORGANIZATION_SLUGS } from '@/lib/organization-slug'

describe('parseMobileEditionSlug', () => {
  it('accepts kelme-invierno-puerto-varas-2026', () => {
    expect(parseMobileEditionSlug('kelme-invierno-puerto-varas-2026')).toEqual({
      ok: true,
      slug: 'kelme-invierno-puerto-varas-2026',
    })
  })

  it('rejects reserved org slugs', () => {
    for (const slug of RESERVED_ORGANIZATION_SLUGS) {
      expect(parseMobileEditionSlug(slug)).toEqual({ ok: false, error: 'reserved' })
    }
  })

  it('rejects uppercase', () => {
    expect(parseMobileEditionSlug('Kelme').ok).toBe(false)
  })
})

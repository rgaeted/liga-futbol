import { describe, expect, it } from 'vitest'
import {
  ORGANIZATION_SLUG_REGEX,
  RESERVED_ORGANIZATION_SLUGS,
  parseOrganizationSlug,
} from '@/lib/organization-slug'

describe('parseOrganizationSlug', () => {
  it('accepts kelme', () => {
    expect(parseOrganizationSlug('kelme')).toEqual({ ok: true, slug: 'kelme' })
  })

  it('rejects reserved slugs', () => {
    for (const slug of ['plataforma', 'login', 'admin', 'live', 'api']) {
      expect(parseOrganizationSlug(slug)).toEqual({ ok: false, error: 'reserved' })
    }
  })

  it('rejects uppercase and spaces', () => {
    expect(parseOrganizationSlug('Kelme').ok).toBe(false)
    expect(parseOrganizationSlug('liga sur').ok).toBe(false)
  })

  it('exports a regex matching the parser', () => {
    expect(ORGANIZATION_SLUG_REGEX.test('kelme-invierno-2026')).toBe(true)
    expect(RESERVED_ORGANIZATION_SLUGS.has('privacidad')).toBe(true)
  })
})

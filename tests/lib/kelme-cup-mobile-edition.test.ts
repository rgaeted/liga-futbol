// tests/lib/kelme-cup-mobile-edition.test.ts
import { describe, expect, it } from 'vitest'
import { CUP_ORG_SLUG } from '@/lib/copa-kelme-los-lagos'
import {
  KELME_CUP_MOBILE_API_BASE_URL,
  KELME_CUP_MOBILE_BUNDLE_ID,
  KELME_CUP_MOBILE_DISPLAY_NAME,
  KELME_CUP_MOBILE_SHORT_NAME,
  KELME_CUP_MOBILE_SLUG,
  KELME_CUP_MOBILE_URL_SCHEME,
  assertKelmeCupMobilePublishReady,
  kelmeCupMobileDescription,
  kelmeCupMobileLogoStoragePath,
  kelmeCupMobileScaffoldConfig,
} from '@/lib/kelme-cup-mobile-edition'
import { nativeBundleIdPreview, parseMobileEditionSlug } from '@/lib/mobile-edition-slug'
import { buildEditionConfigSource } from '@/lib/mobile-edition-scaffold'
import { KELME_CUP_PRIMARY, KELME_CUP_SECONDARY } from '@/lib/org-brand'

describe('kelme cup mobile edition identity', () => {
  it('accepts the edition slug and rejects the org slug as edition slug', () => {
    expect(parseMobileEditionSlug(KELME_CUP_MOBILE_SLUG)).toEqual({
      ok: true,
      slug: 'kelme-cup-los-lagos-2026',
    })
    expect(KELME_CUP_MOBILE_SLUG).not.toBe('kelme')
  })

  it('matches the native bundle convention', () => {
    expect(nativeBundleIdPreview(CUP_ORG_SLUG, KELME_CUP_MOBILE_SLUG)).toBe(
      KELME_CUP_MOBILE_BUNDLE_ID,
    )
    expect(KELME_CUP_MOBILE_BUNDLE_ID).toBe('cl.admintorneo.kelme.kelmecuploslagos2026')
    expect(KELME_CUP_MOBILE_URL_SCHEME).toBe('kelmecuploslagos2026')
  })

  it('builds flyer-aligned description and scaffold source', () => {
    expect(kelmeCupMobileDescription()).toBe(
      'Torneo infantil de fútbol en Los Lagos. Domingo 25 de octubre, Canchas Colegio Puerto Varas, desde 9:00 a 14:00 horas.',
    )
    const source = buildEditionConfigSource(kelmeCupMobileScaffoldConfig('season-cup-1'))
    expect(source).toContain("slug: 'kelme-cup-los-lagos-2026'")
    expect(source).toContain(`displayName: '${KELME_CUP_MOBILE_DISPLAY_NAME}'`)
    expect(source).toContain(`shortName: '${KELME_CUP_MOBILE_SHORT_NAME}'`)
    expect(source).toContain(KELME_CUP_PRIMARY)
    expect(source).toContain(KELME_CUP_SECONDARY)
    expect(source).toContain(KELME_CUP_MOBILE_API_BASE_URL)
    expect(source).toContain(KELME_CUP_MOBILE_BUNDLE_ID)
    expect(source).not.toContain('#CD212A')
    expect(source).not.toContain('torneos-kelme.vercel.app')
  })

  it('builds the editorial logo path and publish guards', () => {
    expect(kelmeCupMobileLogoStoragePath('ckll-season-1')).toBe(
      'seasons/ckll-season-1/mobile/logo.png',
    )
    expect(
      assertKelmeCupMobilePublishReady({ registeredTeamCount: 0, logoStoragePath: 'x' }),
    ).toEqual({ ok: false, error: 'Debes inscribir al menos un equipo antes de publicar' })
    expect(
      assertKelmeCupMobilePublishReady({ registeredTeamCount: 1, logoStoragePath: null }),
    ).toEqual({ ok: false, error: 'Sube el logo de la edición antes de publicar' })
    expect(
      assertKelmeCupMobilePublishReady({
        registeredTeamCount: 1,
        logoStoragePath: 'seasons/ckll-season-1/mobile/logo.png',
      }),
    ).toEqual({ ok: true })
  })
})

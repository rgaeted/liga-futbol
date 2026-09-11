// src/lib/kelme-cup-mobile-edition.ts
import { CUP_ORG_SLUG } from '@/lib/copa-kelme-los-lagos'
import { editorialStoragePath } from '@/lib/editorial/urls'
import type { EditionScaffoldConfig } from '@/lib/mobile-edition-scaffold'
import { nativeBundleIdPreview } from '@/lib/mobile-edition-slug'
import { KELME_CUP, KELME_CUP_PRIMARY, KELME_CUP_SECONDARY } from '@/lib/org-brand'

export const KELME_CUP_MOBILE_SLUG = 'kelme-cup-los-lagos-2026'
export const KELME_CUP_MOBILE_DISPLAY_NAME = 'Kelme Cup Los Lagos 2026'
export const KELME_CUP_MOBILE_SHORT_NAME = 'Kelme Cup'
export const KELME_CUP_MOBILE_API_BASE_URL = 'https://ligalab.cl'
export const KELME_CUP_MOBILE_URL_SCHEME = KELME_CUP_MOBILE_SLUG.replace(/-/g, '')
export const KELME_CUP_MOBILE_BUNDLE_ID = nativeBundleIdPreview(
  CUP_ORG_SLUG,
  KELME_CUP_MOBILE_SLUG,
)

export function kelmeCupMobileDescription(): string {
  const timeLabel =
    KELME_CUP.timeLabel.charAt(0).toLowerCase() + KELME_CUP.timeLabel.slice(1)
  return `${KELME_CUP.subtitle} en ${KELME_CUP.region}. ${KELME_CUP.dateLabel}, ${KELME_CUP.venue}, ${timeLabel}.`
}

export function kelmeCupMobileScaffoldConfig(seasonId: string): EditionScaffoldConfig {
  return {
    slug: KELME_CUP_MOBILE_SLUG,
    displayName: KELME_CUP_MOBILE_DISPLAY_NAME,
    shortName: KELME_CUP_MOBILE_SHORT_NAME,
    organizationSlug: CUP_ORG_SLUG,
    seasonId,
    primaryColor: KELME_CUP_PRIMARY,
    secondaryColor: KELME_CUP_SECONDARY,
    apiBaseUrl: KELME_CUP_MOBILE_API_BASE_URL,
  }
}

export function kelmeCupMobileLogoStoragePath(seasonId: string): string {
  return editorialStoragePath(['seasons', seasonId, 'mobile', 'logo.png'])
}

export function assertKelmeCupMobilePublishReady(input: {
  registeredTeamCount: number
  logoStoragePath: string | null
}): { ok: true } | { ok: false; error: string } {
  if (input.registeredTeamCount < 1) {
    return { ok: false, error: 'Debes inscribir al menos un equipo antes de publicar' }
  }
  if (!input.logoStoragePath) {
    return { ok: false, error: 'Sube el logo de la edición antes de publicar' }
  }
  return { ok: true }
}

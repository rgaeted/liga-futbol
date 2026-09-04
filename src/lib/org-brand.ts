export const LOSLUNES_SLUG = 'loslunes'
export const LOSLUNES_LOGO_PATH = '/branding/loslunes-logo.jpg'
export const LOSLUNES_PRIMARY = '#F57F20'
export const LOSLUNES_SECONDARY = '#111111'

export function resolveOrgLandingLogo(
  slug: string,
  storedLogoUrl: string | null | undefined,
): string | null {
  if (storedLogoUrl) return storedLogoUrl
  if (slug === LOSLUNES_SLUG) return LOSLUNES_LOGO_PATH
  return null
}

export function resolveOrgBrandColors(
  slug: string,
  primaryColor: string,
  secondaryColor: string,
): { primaryColor: string; secondaryColor: string } {
  if (slug === LOSLUNES_SLUG) {
    return { primaryColor: LOSLUNES_PRIMARY, secondaryColor: LOSLUNES_SECONDARY }
  }
  return { primaryColor, secondaryColor }
}

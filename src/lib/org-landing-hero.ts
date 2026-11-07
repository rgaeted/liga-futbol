import { editorialPublicUrl } from '@/lib/editorial/urls'
import { LOSLUNES_HERO_PATH, LOSLUNES_SLUG } from '@/lib/org-brand'

export function defaultOrgLandingHeroImageUrls(slug: string): string[] {
  if (slug === LOSLUNES_SLUG) return [LOSLUNES_HERO_PATH]
  return []
}

export function resolveOrgLandingHeroImageUrls(
  slug: string,
  storagePaths: string[],
): string[] {
  const uploaded = storagePaths
    .map((path) => editorialPublicUrl(path))
    .filter((url): url is string => Boolean(url))
  if (uploaded.length > 0) return uploaded
  return defaultOrgLandingHeroImageUrls(slug)
}

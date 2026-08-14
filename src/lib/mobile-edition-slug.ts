import {
  ORGANIZATION_SLUG_REGEX,
  RESERVED_ORGANIZATION_SLUGS,
  type ParseSlugResult,
} from '@/lib/organization-slug'

export function parseMobileEditionSlug(raw: string): ParseSlugResult {
  if (!ORGANIZATION_SLUG_REGEX.test(raw)) return { ok: false, error: 'invalid' }
  if (RESERVED_ORGANIZATION_SLUGS.has(raw)) return { ok: false, error: 'reserved' }
  return { ok: true, slug: raw }
}

export function nativeBundleIdPreview(organizationSlug: string, editionSlug: string): string {
  const seasonKey = editionSlug.replace(/[^a-z0-9]/g, '')
  return `cl.admintorneo.${organizationSlug}.${seasonKey}`.slice(0, 155)
}

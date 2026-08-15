export const RESERVED_ORGANIZATION_SLUGS = new Set([
  'plataforma',
  'login',
  'register',
  'api',
  'privacidad',
  'admin',
  'coach',
  'player',
  'referee',
  'live',
  'ayuda',
  'mantenimiento',
  'organizaciones',
])

export const ORGANIZATION_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type ParseSlugResult =
  | { ok: true; slug: string }
  | { ok: false; error: 'reserved' | 'invalid' }

export function parseOrganizationSlug(raw: string): ParseSlugResult {
  if (!ORGANIZATION_SLUG_REGEX.test(raw)) return { ok: false, error: 'invalid' }
  if (RESERVED_ORGANIZATION_SLUGS.has(raw)) return { ok: false, error: 'reserved' }
  return { ok: true, slug: raw }
}

const LEGACY_ROOTS = ['/admin', '/coach', '/referee', '/player', '/live', '/ayuda'] as const

export function orgPath(slug: string, path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `/${slug}${suffix}`
}

export function rewriteLegacyTenantPath(
  pathname: string,
  defaultSlug = 'kelme',
): string | null {
  for (const root of LEGACY_ROOTS) {
    if (pathname === root || pathname.startsWith(`${root}/`)) {
      return `/${defaultSlug}${pathname}`
    }
  }
  return null
}

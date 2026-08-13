import { getRuntimeEditionConfig } from './runtime-config'

const EDITION = getRuntimeEditionConfig()

export function parseDeepLink(url: string): { pathname: string } {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === `${EDITION.urlScheme}:`) {
      const hostPart = parsed.host ? `/${parsed.host}` : ''
      const pathPart = parsed.pathname === '/' ? '' : parsed.pathname
      const pathname = `${hostPart}${pathPart}` || '/'
      return { pathname: pathname.startsWith('/') ? pathname : `/${pathname}` }
    }
    return { pathname: '/' }
  } catch {
    return { pathname: '/' }
  }
}

export function buildDeepLink(pathname: string): string {
  const normalized = pathname.startsWith('/') ? pathname.slice(1) : pathname
  return `${EDITION.urlScheme}://${normalized}`
}

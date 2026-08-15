export const ORG_COOKIE = 'admintorneo.org'

export function orgCookieOptions(organizationId: string) {
  return {
    name: ORG_COOKIE,
    value: organizationId,
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  }
}

export function clearOrgCookieOptions() {
  return {
    name: ORG_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  }
}

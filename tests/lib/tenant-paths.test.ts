import { describe, expect, it } from 'vitest'
import { orgPath, rewriteLegacyTenantPath } from '@/lib/tenant-paths'

describe('tenant paths', () => {
  it('builds org-prefixed paths', () => {
    expect(orgPath('kelme', '/admin/matches')).toBe('/kelme/admin/matches')
    expect(orgPath('kelme', 'admin')).toBe('/kelme/admin')
  })

  it('rewrites legacy bookmarks to kelme', () => {
    expect(rewriteLegacyTenantPath('/admin')).toBe('/kelme/admin')
    expect(rewriteLegacyTenantPath('/admin/matches')).toBe('/kelme/admin/matches')
    expect(rewriteLegacyTenantPath('/live/abc')).toBe('/kelme/live/abc')
    expect(rewriteLegacyTenantPath('/ayuda')).toBe('/kelme/ayuda')
    expect(rewriteLegacyTenantPath('/coach')).toBe('/kelme/coach')
    expect(rewriteLegacyTenantPath('/login')).toBeNull()
    expect(rewriteLegacyTenantPath('/kelme/admin')).toBeNull()
    expect(rewriteLegacyTenantPath('/plataforma')).toBeNull()
  })
})

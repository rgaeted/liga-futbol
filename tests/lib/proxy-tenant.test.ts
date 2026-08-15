import { describe, expect, it } from 'vitest'
import { tenantDashboardArea } from '@/lib/proxy-tenant'

describe('tenantDashboardArea', () => {
  it('parses tenant admin paths', () => {
    expect(tenantDashboardArea('/kelme/admin/matches')).toEqual({
      slug: 'kelme',
      area: 'admin',
    })
  })

  it('returns null for platform routes', () => {
    expect(tenantDashboardArea('/plataforma')).toBeNull()
  })

  it('returns null for tenant live routes', () => {
    expect(tenantDashboardArea('/kelme/live/x')).toBeNull()
  })

  it('returns null for API admin routes so they are not treated as tenant slug "api"', () => {
    expect(tenantDashboardArea('/api/admin/dashboard')).toBeNull()
    expect(tenantDashboardArea('/api/admin/referees')).toBeNull()
    expect(tenantDashboardArea('/api/player/friendly-matches')).toBeNull()
    expect(tenantDashboardArea('/api/coach/callups')).toBeNull()
    expect(tenantDashboardArea('/api/referee/matches')).toBeNull()
  })

  it('returns null for reserved first segments', () => {
    expect(tenantDashboardArea('/plataforma/admin')).toBeNull()
    expect(tenantDashboardArea('/organizaciones/admin')).toBeNull()
  })
})

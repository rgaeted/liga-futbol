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
})

import { describe, it, expect } from 'vitest'
import { Role } from '@/lib/roles'
import { canAccess, getDashboardPath } from '@/lib/roles'

describe('roles', () => {
  it('admin can access admin routes', () => {
    expect(canAccess(Role.ADMIN, 'admin')).toBe(true)
  })

  it('player cannot access admin routes', () => {
    expect(canAccess(Role.PLAYER, 'admin')).toBe(false)
  })

  it('returns correct dashboard path per role', () => {
    expect(getDashboardPath(Role.COACH)).toBe('/coach')
    expect(getDashboardPath(Role.REFEREE)).toBe('/referee')
  })
})

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
    expect(getDashboardPath(Role.FRIENDLY_COACH)).toBe('/player/friendly-matches')
  })

  it('friendly coach can access player area', () => {
    expect(canAccess(Role.FRIENDLY_COACH, 'player')).toBe(true)
    expect(canAccess(Role.FRIENDLY_COACH, 'coach')).toBe(false)
  })
})

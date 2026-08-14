import { describe, expect, it } from 'vitest'
import { PersonConflictError, assertPersonFichaAvailable } from '@/lib/person'

describe('assertPersonFichaAvailable', () => {
  it('throws 409 when league ficha already exists in org', () => {
    expect(() =>
      assertPersonFichaAvailable({
        existingPlayerOrgIds: ['org-1'],
        existingFriendlyOrgIds: [],
        organizationId: 'org-1',
        kind: 'league',
      }),
    ).toThrow(PersonConflictError)
  })

  it('allows league ficha when person only has friendly in that org', () => {
    expect(() =>
      assertPersonFichaAvailable({
        existingPlayerOrgIds: [],
        existingFriendlyOrgIds: ['org-1'],
        organizationId: 'org-1',
        kind: 'league',
      }),
    ).not.toThrow()
  })

  it('allows same person league in another org', () => {
    expect(() =>
      assertPersonFichaAvailable({
        existingPlayerOrgIds: ['org-1'],
        existingFriendlyOrgIds: [],
        organizationId: 'org-2',
        kind: 'league',
      }),
    ).not.toThrow()
  })
})

describe('canClaimPerson', () => {
  it('rejects already claimed profile', async () => {
    const { canClaimPerson } = await import('@/lib/person')
    expect(canClaimPerson('user-1', null, 'person-1')).toEqual({
      ok: false,
      status: 409,
      error: 'Este perfil ya fue reclamado',
    })
  })

  it('rejects when claimant has another person', async () => {
    const { canClaimPerson } = await import('@/lib/person')
    expect(canClaimPerson(null, 'other-person', 'person-1')).toEqual({
      ok: false,
      status: 409,
      error: 'Esa cuenta ya está ligada a otra persona; pide a un admin que fusione',
    })
  })

  it('allows claim when profile and account are free', async () => {
    const { canClaimPerson } = await import('@/lib/person')
    expect(canClaimPerson(null, null, 'person-1')).toEqual({ ok: true })
  })
})

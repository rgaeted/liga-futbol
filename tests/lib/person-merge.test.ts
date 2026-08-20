import { describe, expect, it } from 'vitest'
import { PersonConflictError } from '@/lib/person'
import { planOrgMerge, planPlatformMerge } from '@/lib/person-merge'

describe('planOrgMerge', () => {
  it('plans org merge using only player fichas', () => {
    expect(
      planOrgMerge({
        organizationId: 'org-1',
        source: { id: 'a', userId: null, playerOrgIds: ['org-1'] },
        dest: { id: 'b', userId: null, playerOrgIds: [] },
      }).movePlayerOrgIds,
    ).toEqual(['org-1'])
  })

  it('rejects when dest already has player ficha in org', () => {
    expect(() =>
      planOrgMerge({
        organizationId: 'org-1',
        source: { id: 's', userId: null, playerOrgIds: ['org-1'] },
        dest: { id: 'd', userId: 'u1', playerOrgIds: ['org-1'] },
      }),
    ).toThrow(PersonConflictError)
  })

  it('moves only fichas of this org', () => {
    const plan = planOrgMerge({
      organizationId: 'org-1',
      source: { id: 's', userId: null, playerOrgIds: ['org-1', 'org-2'] },
      dest: { id: 'd', userId: 'u1', playerOrgIds: [] },
    })
    expect(plan.movePlayerOrgIds).toEqual(['org-1'])
    expect(plan.deleteSourcePerson).toBe(false)
  })
})

describe('planPlatformMerge', () => {
  it('rejects two accounts', () => {
    expect(() =>
      planPlatformMerge({
        source: { id: 's', userId: 'u1', playerOrgIds: ['org-1'] },
        dest: { id: 'd', userId: 'u2', playerOrgIds: [] },
      }),
    ).toThrow(PersonConflictError)
  })
})

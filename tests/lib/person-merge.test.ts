import { describe, expect, it } from 'vitest'
import { PersonConflictError } from '@/lib/person'
import { planOrgMerge, planPlatformMerge } from '@/lib/person-merge'

describe('planOrgMerge', () => {
  it('rejects when dest already has same ficha type in org', () => {
    expect(() =>
      planOrgMerge({
        organizationId: 'org-1',
        source: { id: 's', userId: null, playerOrgIds: ['org-1'], friendlyOrgIds: [] },
        dest: { id: 'd', userId: 'u1', playerOrgIds: ['org-1'], friendlyOrgIds: [] },
      }),
    ).toThrow(PersonConflictError)
  })

  it('moves only fichas of this org', () => {
    const plan = planOrgMerge({
      organizationId: 'org-1',
      source: { id: 's', userId: null, playerOrgIds: ['org-1', 'org-2'], friendlyOrgIds: [] },
      dest: { id: 'd', userId: 'u1', playerOrgIds: [], friendlyOrgIds: ['org-1'] },
    })
    expect(plan.movePlayerOrgIds).toEqual(['org-1'])
    expect(plan.deleteSourcePerson).toBe(false)
  })
})

describe('planPlatformMerge', () => {
  it('rejects two accounts', () => {
    expect(() =>
      planPlatformMerge({
        source: { id: 's', userId: 'u1', playerOrgIds: ['org-1'], friendlyOrgIds: [] },
        dest: { id: 'd', userId: 'u2', playerOrgIds: [], friendlyOrgIds: [] },
      }),
    ).toThrow(PersonConflictError)
  })
})

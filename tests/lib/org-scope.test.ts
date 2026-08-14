import { describe, expect, it } from 'vitest'
import { assertSameOrganization } from '@/lib/org-scope'

describe('assertSameOrganization', () => {
  it('passes when ids match', () => {
    expect(() => assertSameOrganization('org_a', 'org_a')).not.toThrow()
  })

  it('throws when ids differ', () => {
    expect(() => assertSameOrganization('org_a', 'org_b')).toThrow('Forbidden')
  })
})

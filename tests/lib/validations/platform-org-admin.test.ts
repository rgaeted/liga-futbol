import { describe, expect, it } from 'vitest'
import { grantOrgAdminAccessSchema } from '@/lib/validations/platform-org-admin'

describe('grantOrgAdminAccessSchema', () => {
  const valid = {
    email: 'ana@liga.com',
    name: 'Ana Pérez',
    password: 'secret1',
    organizationIds: ['org-1'],
  }

  it('accepts a new-user payload', () => {
    expect(grantOrgAdminAccessSchema.parse(valid)).toEqual(valid)
  })

  it('accepts existing-user payload without password', () => {
    const { password: _, ...rest } = valid
    expect(grantOrgAdminAccessSchema.parse(rest).password).toBeUndefined()
  })

  it('rejects invalid email, short name, short password, empty orgs', () => {
    expect(grantOrgAdminAccessSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false)
    expect(grantOrgAdminAccessSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false)
    expect(grantOrgAdminAccessSchema.safeParse({ ...valid, password: '12345' }).success).toBe(false)
    expect(grantOrgAdminAccessSchema.safeParse({ ...valid, organizationIds: [] }).success).toBe(false)
  })
})

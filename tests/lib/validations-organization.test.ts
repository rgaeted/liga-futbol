import { describe, expect, it } from 'vitest'
import { createOrganizationSchema } from '@/lib/validations/organization'

describe('createOrganizationSchema', () => {
  it('rejects reserved slug', () => {
    const parsed = createOrganizationSchema.safeParse({
      slug: 'admin',
      name: 'X',
      primaryColor: '#CD212A',
      secondaryColor: '#FFFFFF',
      adminEmail: 'a@b.cl',
      adminName: 'Ana Admin',
      adminPassword: 'secret1',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts kelme-like payload', () => {
    const parsed = createOrganizationSchema.safeParse({
      slug: 'liga-sur',
      name: 'Liga Sur',
      primaryColor: '#1d4ed8',
      secondaryColor: '#ffffff',
      adminEmail: 'dt@liga.cl',
      adminName: 'Ana Soto',
      adminPassword: 'secret1',
    })
    expect(parsed.success).toBe(true)
  })
})

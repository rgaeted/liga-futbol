import { describe, expect, it } from 'vitest'
import { mobileConfigSchema } from '@/lib/validations/mobile-season'

describe('mobileConfigSchema', () => {
  it('accepts a stable kebab-case slug and valid hex colors', () => {
    expect(
      mobileConfigSchema.safeParse({
        slug: 'liga-invierno-kelme-puerto-varas-2026',
        displayName: 'Liga de Invierno Kelme Puerto Varas 2026',
        primaryColor: '#CD212A',
        secondaryColor: '#FFFFFF',
        isPublished: false,
      }).success,
    ).toBe(true)
  })

  it('rejects slugs with spaces', () => {
    expect(mobileConfigSchema.safeParse({ slug: 'Liga Invierno', displayName: 'Liga' }).success).toBe(false)
  })
})

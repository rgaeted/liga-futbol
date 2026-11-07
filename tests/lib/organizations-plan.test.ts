import { describe, expect, it } from 'vitest'
import { BILLING_PLAN_LABELS } from '@/lib/billing/plans'
import { updateOrganizationPlanSchema } from '@/lib/validations/organization'

describe('updateOrganizationPlanSchema', () => {
  it('accepts the three plans', () => {
    expect(updateOrganizationPlanSchema.safeParse({ plan: 'CLUB' }).success).toBe(true)
    expect(updateOrganizationPlanSchema.safeParse({ plan: 'FREE' }).success).toBe(true)
    expect(updateOrganizationPlanSchema.safeParse({ plan: 'LEAGUE' }).success).toBe(true)
  })

  it('rejects unknown plans', () => {
    expect(updateOrganizationPlanSchema.safeParse({ plan: 'PRO' }).success).toBe(false)
  })

  it('exposes Chilean labels', () => {
    expect(BILLING_PLAN_LABELS.FREE).toBe('Gratis')
    expect(BILLING_PLAN_LABELS.CLUB).toBe('Club')
    expect(BILLING_PLAN_LABELS.LEAGUE).toBe('Liga')
  })
})

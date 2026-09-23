'use client'

import { useRouter } from 'next/navigation'
import { BillingPlanSelect } from '@/components/billing/BillingPlanSelect'
import type { BillingPlan } from '@/lib/billing/plans'

type Props = {
  organizationId: string
  plan: BillingPlan
}

export function OrganizationPlanSelect({ organizationId, plan }: Props) {
  const router = useRouter()

  async function handleChange(nextPlan: BillingPlan) {
    await fetch(`/api/plataforma/organizations/${organizationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: nextPlan }),
    })
    router.refresh()
  }

  return (
    <BillingPlanSelect
      value={plan}
      onChange={(nextPlan) => void handleChange(nextPlan)}
      label="Plan de la empresa"
      className="min-w-[140px]"
    />
  )
}

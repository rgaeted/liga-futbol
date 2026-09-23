'use client'

import { useRouter } from 'next/navigation'
import { BILLING_PLAN_LABELS, BILLING_PLANS, type BillingPlan } from '@/lib/billing/plans'
import { platformInputClass } from '@/components/plataforma/platform-ui'

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
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#8A938C]">
        Plan de la empresa
      </span>
      <select
        value={plan}
        onChange={(e) => void handleChange(e.target.value as BillingPlan)}
        className={`${platformInputClass} min-w-[120px] py-2 text-xs font-bold`}
        aria-label="Plan de la empresa"
      >
        {BILLING_PLANS.map((value) => (
          <option key={value} value={value}>
            {BILLING_PLAN_LABELS[value]}
          </option>
        ))}
      </select>
    </label>
  )
}

'use client'

import {
  BILLING_PLAN_LABELS,
  BILLING_PLANS,
  type BillingPlan,
} from '@/lib/billing/plans'
import { platformInputClass } from '@/components/plataforma/platform-ui'

type Props = {
  value: BillingPlan
  onChange: (plan: BillingPlan) => void
  label?: string
  id?: string
  className?: string
}

export function BillingPlanSelect({
  value,
  onChange,
  label = 'Plan de la empresa',
  id = 'billing-plan',
  className,
}: Props) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <span className="text-sm font-bold text-[#8A938C]">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as BillingPlan)}
        className={`${platformInputClass} py-2.5 text-sm font-bold`}
        aria-label={label}
      >
        {BILLING_PLANS.map((plan) => (
          <option key={plan} value={plan}>
            {BILLING_PLAN_LABELS[plan]}
          </option>
        ))}
      </select>
    </label>
  )
}

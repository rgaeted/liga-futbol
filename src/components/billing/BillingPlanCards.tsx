import Link from 'next/link'
import {
  BILLING_PLAN_HIGHLIGHTS,
  BILLING_PLAN_LABELS,
  type BillingPlan,
} from '@/lib/billing/plans'

const PLAN_ORDER: BillingPlan[] = ['FREE', 'CLUB', 'LEAGUE']

type Props = {
  showCta?: boolean
}

export function BillingPlanCards({ showCta = true }: Props) {
  return (
    <div className="grid gap-[18px] lg:grid-cols-3">
      {PLAN_ORDER.map((plan) => {
        const isOrganizerPlan = plan !== 'FREE'
        return (
          <article
            key={plan}
            className={`card-kelme flex flex-col p-6 ${
              plan === 'LEAGUE' ? 'ring-1 ring-org-primary/40' : ''
            }`}
          >
            <p className="font-ui text-[11px] font-black uppercase tracking-[0.13em] text-[#8A938C]">
              {plan === 'LEAGUE' ? 'Recomendado para ligas' : plan === 'CLUB' ? 'Para clubes' : 'Para jugadores'}
            </p>
            <h3 className="mt-2 text-2xl font-black text-[#E8E4D8]">{BILLING_PLAN_LABELS[plan]}</h3>
            <p className="mt-2 text-sm text-[#8A938C]">
              {plan === 'FREE'
                ? 'Usa LigaLab sin pagar: mira, anótate y juega.'
                : plan === 'CLUB'
                  ? 'Organiza amistosos y equipos con vitrina pública.'
                  : 'Opera temporadas, fixture oficial y contenido de liga.'}
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-[#C8CEC9]">
              {BILLING_PLAN_HIGHLIGHTS[plan].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-org-primary" aria-hidden>
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {showCta ? (
              <div className="mt-6">
                {isOrganizerPlan ? (
                  <Link href="/login" className="btn-kelme block text-center text-sm">
                    Quiero organizar
                  </Link>
                ) : (
                  <Link href="/login" className="btn-kelme-outline block text-center text-sm">
                    Ingresar gratis
                  </Link>
                )}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

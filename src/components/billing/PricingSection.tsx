import Link from 'next/link'
import {
  BILLING_PLAN_HIGHLIGHTS,
  BILLING_PLAN_LABELS,
  LEAGUE_TEAM_LIMIT,
  type BillingPlan,
} from '@/lib/billing/plans'

const PLAN_ORDER: BillingPlan[] = ['FREE', 'CLUB', 'LEAGUE']

const PLAN_PRICE: Record<BillingPlan, string> = {
  FREE: '$0',
  CLUB: 'Consultar',
  LEAGUE: 'Consultar',
}

type Props = {
  isLoggedIn?: boolean
  currentPlan?: BillingPlan | null
  showUpgradeNote?: boolean
}

function planCta(
  plan: BillingPlan,
  { isLoggedIn, currentPlan }: { isLoggedIn: boolean; currentPlan: BillingPlan | null },
): { href: string; label: string; variant: 'primary' | 'outline' | 'muted' } | null {
  if (currentPlan === plan) {
    return { href: '/pricing', label: 'Plan actual', variant: 'muted' }
  }

  if (plan === 'FREE') {
    if (isLoggedIn) {
      return null
    }
    return {
      href: '/login?mode=register',
      label: 'Crear cuenta gratis',
      variant: 'outline',
    }
  }

  return {
    href: '/pricing#solicitar',
    label: isLoggedIn ? 'Actualizar plan' : 'Quiero organizar',
    variant: plan === 'LEAGUE' ? 'primary' : 'outline',
  }
}

export function PricingSection({
  isLoggedIn = false,
  currentPlan = null,
  showUpgradeNote = true,
}: Props) {
  return (
    <section id="pricing" className="scroll-mt-24 border-b border-[#2A3A32] bg-[#0B1210]">
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-20">
        <p className="font-ui text-[11px] font-black uppercase tracking-[0.13em] text-[#8A938C]">
          Pricing
        </p>
        <h2 className="mt-2 font-display text-[clamp(1.75rem,3vw,2.25rem)] font-black text-[#E8E4D8]">
          Planes para jugar y para organizar
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-[#8A938C]">
          La cuenta de jugador es gratis. Club y Liga son para quien administra equipos o
          temporadas; te activamos el plan cuando lo solicites.
        </p>

        <div className="mt-10 grid gap-[18px] lg:grid-cols-3">
          {PLAN_ORDER.map((plan) => {
            const cta = planCta(plan, { isLoggedIn, currentPlan })
            const isFeatured = plan === 'LEAGUE'

            return (
              <article
                key={plan}
                className={`card-kelme flex flex-col p-6 ${
                  isFeatured ? 'ring-1 ring-org-primary/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-ui text-[11px] font-black uppercase tracking-[0.13em] text-[#8A938C]">
                      {plan === 'LEAGUE'
                        ? 'Ligas completas'
                        : plan === 'CLUB'
                          ? 'Clubes y amistosos'
                          : 'Jugadores'}
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-[#E8E4D8]">
                      {BILLING_PLAN_LABELS[plan]}
                    </h3>
                  </div>
                  <p className="text-right">
                    <span className="block text-2xl font-black text-[#E8E4D8]">{PLAN_PRICE[plan]}</span>
                    {plan !== 'FREE' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#8A938C]">
                        por organización
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#8A938C]">
                        para siempre
                      </span>
                    )}
                  </p>
                </div>

                <p className="mt-4 text-sm text-[#8A938C]">
                  {plan === 'FREE'
                    ? 'Mira partidos, anótate y juega con tu panel de jugador, DT o árbitro.'
                    : plan === 'CLUB'
                      ? 'Organiza equipos, amistosos y una landing pública de tu club.'
                      : `Opera temporadas, fixture oficial, CMS y app mobile (hasta ${LEAGUE_TEAM_LIMIT} equipos).`}
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

                {cta ? (
                  <div className="mt-6">
                    {cta.variant === 'muted' ? (
                      <span className="block rounded-xl border border-[#2A3A32] px-4 py-2.5 text-center text-sm font-bold text-[#8A938C]">
                        {cta.label}
                      </span>
                    ) : (
                      <Link
                        href={cta.href}
                        className={
                          cta.variant === 'primary'
                            ? 'btn-kelme block text-center text-sm'
                            : 'btn-kelme-outline block text-center text-sm'
                        }
                      >
                        {cta.label}
                      </Link>
                    )}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>

        {showUpgradeNote ? (
          <div
            id="solicitar"
            className="mt-10 scroll-mt-24 rounded-[14px] border border-[#2A3A32] bg-[#121A18] p-6 md:p-8"
          >
            <h3 className="text-lg font-extrabold text-[#E8E4D8]">¿Quieres Club o Liga?</h3>
            <p className="mt-2 max-w-2xl text-sm text-[#8A938C]">
              {isLoggedIn
                ? 'Tu cuenta gratis ya está lista. Escríbenos o pide la activación desde tu panel: revisamos tu caso y te subimos de plan sin perder tu acceso.'
                : 'Primero crea tu cuenta gratis. Después, desde el panel o por acá, puedes pedir activar Club o Liga para tu organización.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {!isLoggedIn ? (
                <Link href="/login?mode=register" className="btn-kelme text-sm">
                  Crear cuenta gratis
                </Link>
              ) : null}
              <a href="mailto:contacto@ligalab.cl" className="btn-kelme-outline text-sm">
                Solicitar activación
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

import Link from 'next/link'
import { PricingSection } from '@/components/billing/PricingSection'
import { MarketingShell } from '@/components/kelme/MarketingShell'
import type { BillingPlan } from '@/lib/billing/plans'

const FEATURES = [
  {
    title: 'Organizadores',
    description: 'Administra ligas, temporadas, equipos y usuarios desde un panel centralizado.',
  },
  {
    title: 'Directores técnicos',
    description: 'Gestiona citaciones, convocatorias y evaluaciones de tu plantel.',
  },
  {
    title: 'Árbitros',
    description: 'Controla el partido en vivo: goles, tarjetas, tiros y eventos en tiempo real.',
  },
  {
    title: 'Marcador en vivo',
    description: 'Sigue los partidos minuto a minuto desde cualquier dispositivo, sin necesidad de cuenta.',
  },
]

type Props = {
  isLoggedIn?: boolean
  panelHref?: string | null
  currentPlan?: BillingPlan | null
}

export function ProductLanding({ isLoggedIn = false, panelHref = null, currentPlan = null }: Props) {
  return (
    <MarketingShell productName="LigaLab" panelHref={panelHref} showLogin={!isLoggedIn}>
      <main className="flex-1">
        <section className="border-b border-[#2A3A32] bg-[#0B1210]">
          <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
            <p className="font-ui text-[11px] font-black uppercase tracking-[0.13em] text-[#8A938C]">
              Marcador · plantel · temporada
            </p>
            <h1 className="font-display mt-3 max-w-2xl text-[clamp(2.5rem,5vw,3.75rem)] font-semibold uppercase leading-none tracking-wide text-[#E8E4D8]">
              El partido se ve de noche
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[#8A938C]">
              LigaLab opera ligas con plantel, fixture y live. Crea tu cuenta gratis para jugar; activa
              Club o Liga cuando quieras organizar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {isLoggedIn ? (
                <>
                  {panelHref ? (
                    <Link href={panelHref} className="btn-kelme">
                      Ir al panel
                    </Link>
                  ) : null}
                  <Link href="/pricing" className="btn-kelme-outline">
                    Actualizar plan
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login?mode=register" className="btn-kelme">
                    Crear cuenta gratis
                  </Link>
                  <Link href="/pricing" className="btn-kelme-outline">
                    Ver precios
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        <PricingSection isLoggedIn={isLoggedIn} currentPlan={currentPlan} />

        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-[22px] font-black text-[#E8E4D8]">
            Todo lo que necesita una liga profesional
          </h2>
          <ul className="mt-8 grid gap-[18px] sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="card-kelme p-6">
                <h3 className="text-lg font-extrabold text-[#E8E4D8]">{feature.title}</h3>
                <p className="mt-2 text-sm text-[#8A938C]">{feature.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </MarketingShell>
  )
}

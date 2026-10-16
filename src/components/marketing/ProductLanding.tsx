import Link from 'next/link'
import { PricingSection } from '@/components/billing/PricingSection'
import { MarketingShell } from '@/components/kelme/MarketingShell'
import type { BillingPlan } from '@/lib/billing/plans'

const PATHS = [
  {
    plan: 'Gratis',
    title: 'Jugar',
    text: 'Ves el marcador sin cuenta. Con una cuenta gratis entras como jugador, DT o árbitro.',
  },
  {
    plan: 'Club',
    title: 'El plantel',
    text: 'Varios equipos, amistosos entre clubes y la página pública del club.',
  },
  {
    plan: 'Liga',
    title: 'La temporada',
    text: 'Fixture oficial, partidos entre clubes y el vivo de toda la fecha.',
  },
] as const

const NIGHT = [
  {
    time: '18:00',
    title: 'Plantel',
    text: 'El club ordena jugadores y equipos. Un mismo club puede tener varios planteles.',
  },
  {
    time: '19:30',
    title: 'Amistoso',
    text: 'El DT arma los dos lados, nombra capitán y cita a la gente que juega esa noche.',
  },
  {
    time: '21:00',
    title: 'Marcador',
    text: 'El árbitro anota el gol. Quien está en la cancha o en la casa lo ve al tiro.',
  },
  {
    time: '22:40',
    title: 'Fixture',
    text: 'La liga publica la fecha, el resultado queda en la temporada y el club sigue con el suyo.',
  },
] as const

type Props = {
  isLoggedIn?: boolean
  panelHref?: string | null
  currentPlan?: BillingPlan | null
}

function LiveBoard() {
  return (
    <aside className="border border-[#2A3A32] bg-[#121A18]" aria-label="Ejemplo de marcador en vivo">
      <div className="h-1 bg-org-primary" />
      <div className="flex items-center justify-between border-b border-[#2A3A32] px-4 py-3">
        <span className="flex items-center gap-2 font-ui text-[11px] font-black uppercase tracking-[0.16em] text-org-primary">
          <span className="live-pulse inline-block h-2 w-2 bg-org-primary" aria-hidden />
          En vivo
        </span>
        <span className="font-data text-xs tracking-wide text-[#8A938C]">MIN 67</span>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-x-6 px-4 py-5">
        <p className="font-display text-2xl font-semibold uppercase leading-none tracking-wide text-[#E8E4D8]">
          Local
        </p>
        <p className="font-display text-5xl font-semibold leading-none text-[#E8E4D8]">2</p>
        <p className="mt-4 font-display text-2xl font-semibold uppercase leading-none tracking-wide text-[#E8E4D8]">
          Visita
        </p>
        <p className="mt-4 font-display text-5xl font-semibold leading-none text-[#8A938C]">1</p>
      </div>
      <p className="border-t border-[#2A3A32] px-4 py-3 font-ui text-sm text-[#C8CEC9]">
        Gol de visita · 64&apos;
      </p>
      <p className="border-t border-[#2A3A32] px-4 py-3 font-ui text-xs text-[#8A938C]">
        Así lo ve quien no tiene cuenta. El número cambia cuando el árbitro carga el evento.
      </p>
    </aside>
  )
}

export function ProductLanding({ isLoggedIn = false, panelHref = null, currentPlan = null }: Props) {
  return (
    <MarketingShell productName="LigaLab" panelHref={panelHref} showLogin={!isLoggedIn}>
      <main className="flex-1">
        <section className="border-b border-[#2A3A32] bg-[#0B1210]">
          <div className="mx-auto grid max-w-5xl items-end gap-10 px-4 py-14 md:grid-cols-[1.35fr_0.75fr] md:py-20">
            <div>
              <p className="font-ui text-[11px] font-black uppercase tracking-[0.16em] text-org-primary">
                El partido se ve de noche
              </p>
              <h1 className="font-display mt-3 max-w-xl text-[clamp(2.75rem,6vw,4.5rem)] font-semibold uppercase leading-[0.9] tracking-wide text-[#E8E4D8]">
                Marcador, plantel y temporada
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-snug text-[#C8CEC9]">
                LigaLab es la cancha de tu grupo. Juegas gratis. El club publica su plantel y sus
                amistosos. La liga arma el fixture y el vivo de la fecha.
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
            <LiveBoard />
          </div>
        </section>

        <section className="border-b border-[#2A3A32] bg-[#121A18]">
          <div className="mx-auto grid max-w-5xl md:grid-cols-3">
            {PATHS.map((path) => (
              <article
                key={path.plan}
                className="border-b border-[#2A3A32] px-4 py-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              >
                <p className="font-data text-[11px] uppercase tracking-[0.14em] text-org-primary">
                  {path.plan}
                </p>
                <h2 className="font-display mt-2 text-3xl font-semibold uppercase tracking-wide text-[#E8E4D8]">
                  {path.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#8A938C]">{path.text}</p>
              </article>
            ))}
          </div>
        </section>

        <PricingSection isLoggedIn={isLoggedIn} currentPlan={currentPlan} />

        <section className="mx-auto max-w-5xl px-4 py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-[0.7fr_1.3fr] md:items-start">
            <div>
              <p className="font-ui text-[11px] font-black uppercase tracking-[0.16em] text-[#8A938C]">
                Una fecha
              </p>
              <h2 className="font-display mt-2 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold uppercase leading-none tracking-wide text-[#E8E4D8]">
                De la citación al pitazo final
              </h2>
            </div>
            <ol className="border-t border-[#2A3A32]">
              {NIGHT.map((step) => (
                <li key={step.time} className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-[#2A3A32] py-4">
                  <span className="font-data text-sm text-org-primary">{step.time}</span>
                  <div>
                    <h3 className="font-display text-xl font-semibold uppercase tracking-wide text-[#E8E4D8]">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#8A938C]">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </MarketingShell>
  )
}

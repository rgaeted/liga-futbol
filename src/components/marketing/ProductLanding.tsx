import Link from 'next/link'
import { MarketingShell } from '@/components/kelme/MarketingShell'

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

export function ProductLanding() {
  return (
    <MarketingShell productName="LigaLab">
      <main className="flex-1">
        <section className="border-b border-[#e5e5e9] bg-white">
          <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
            <p className="font-ui text-[11px] font-black uppercase tracking-[0.13em] text-[#999]">
              Plataforma SaaS
            </p>
            <h1 className="mt-3 max-w-2xl text-[clamp(2.5rem,5vw,3.5rem)] font-black leading-none tracking-[-0.04em] text-[#17171a]">
              LigaLab
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[#777]">
              Vende y opera la administración de ligas para empresas organizadoras: equipos,
              partidos en vivo, estadísticas y app móvil por temporada.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-kelme">
                Ingresar
              </Link>
              <Link href="/kelme/ayuda" className="btn-kelme-outline">
                Guía de uso
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-[22px] font-black text-[#17171a]">
            Todo lo que necesita una liga profesional
          </h2>
          <ul className="mt-8 grid gap-[18px] sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="card-kelme p-6">
                <h3 className="text-lg font-extrabold text-[#17171a]">{feature.title}</h3>
                <p className="mt-2 text-sm text-[#777]">{feature.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </MarketingShell>
  )
}

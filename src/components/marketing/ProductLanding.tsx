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
    <MarketingShell productName="AdminTorneo">
      <main className="flex-1">
        <section className="border-b border-kelme-border bg-kelme-surface">
          <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
            <p className="font-ui text-sm font-semibold uppercase tracking-widest text-kelme-red">
              Plataforma SaaS
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-extrabold leading-tight text-kelme-gray-900 md:text-5xl">
              AdminTorneo
            </h1>
            <p className="mt-4 max-w-xl font-body text-lg text-kelme-gray-600">
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
          <h2 className="font-display text-2xl font-bold text-kelme-gray-900">
            Todo lo que necesita una liga profesional
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="card-kelme p-6">
                <h3 className="font-display text-lg font-semibold text-kelme-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 font-body text-sm text-kelme-gray-600">{feature.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </MarketingShell>
  )
}

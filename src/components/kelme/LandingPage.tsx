import Link from 'next/link'
import { KelmeLogo } from './KelmeLogo'
import { APP_LOCALE } from '@/lib/locale'

export type LiveMatchPreview = {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
  venue: string | null
  scheduledAt: string
  seasonName: string
}

const FEATURES = [
  {
    title: 'Jugadores',
    description: 'Consulta tus partidos, estadísticas y rendimiento en cada fecha del torneo.',
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

const STATUS_LABELS: Record<string, string> = {
  LIVE: 'En vivo',
  HALFTIME: 'Entretiempo',
}

function formatMatchTime(iso: string) {
  return new Date(iso).toLocaleString(APP_LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function LandingPage({ liveMatches }: { liveMatches: LiveMatchPreview[] }) {
  const firstLiveMatch = liveMatches[0]

  return (
    <div className="flex min-h-screen flex-col bg-kelme-bg">
      <header className="border-b border-kelme-border bg-kelme-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <KelmeLogo size="md" />
          <Link href="/login" className="btn-kelme">
            Ingresar
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b border-kelme-border bg-kelme-surface">
          <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
            <p className="font-ui text-sm font-semibold uppercase tracking-widest text-kelme-red">
              Plataforma oficial
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-extrabold leading-tight text-kelme-gray-900 md:text-5xl">
              Torneos Kelme
            </h1>
            <p className="mt-4 max-w-xl font-body text-lg text-kelme-gray-600">
              La liga de fútbol de marca KELME en un solo lugar: gestión de equipos,
              partidos en vivo y estadísticas para jugadores, cuerpo técnico y árbitros.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-kelme">
                Acceder al torneo
              </Link>
              {firstLiveMatch ? (
                <Link href={`/live/${firstLiveMatch.id}`} className="btn-kelme-outline">
                  Ver partido en vivo
                </Link>
              ) : (
                <a href="#partidos-en-vivo" className="btn-kelme-outline">
                  Partidos en vivo
                </a>
              )}
            </div>
          </div>
        </section>

        <section id="partidos-en-vivo" className="border-b border-kelme-border bg-kelme-bg">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-ui text-sm font-semibold uppercase tracking-widest text-kelme-red">
                  Ahora
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold text-kelme-gray-900">
                  Partidos en vivo
                </h2>
              </div>
              {liveMatches.length > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full bg-kelme-red/10 px-3 py-1 font-ui text-sm font-semibold text-kelme-red">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-kelme-red" />
                  {liveMatches.length} en curso
                </span>
              )}
            </div>

            {liveMatches.length === 0 ? (
              <div className="card-kelme mt-8 p-8 text-center">
                <p className="font-ui font-semibold text-kelme-gray-900">
                  No hay partidos en vivo en este momento
                </p>
                <p className="mt-2 font-body text-sm text-kelme-gray-600">
                  Vuelve más tarde para seguir el marcador en tiempo real.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-4">
                {liveMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/live/${match.id}`}
                    className="card-kelme block p-5 transition-colors hover:border-kelme-red/50 hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-ui text-xs uppercase tracking-wide text-kelme-gray-400">
                        {match.seasonName} · {formatMatchTime(match.scheduledAt)}
                        {match.venue ? ` · ${match.venue}` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-kelme-red px-2.5 py-0.5 font-ui text-xs font-semibold text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        {STATUS_LABELS[match.status] ?? match.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-1 flex-wrap items-center justify-center gap-4 md:justify-start">
                        <span className="min-w-[120px] text-right font-ui font-semibold text-kelme-gray-900">
                          {match.homeTeam}
                        </span>
                        <span className="rounded-lg bg-kelme-gray-100 px-4 py-2 font-mono text-2xl font-bold text-kelme-gray-900">
                          {match.homeScore} - {match.awayScore}
                        </span>
                        <span className="min-w-[120px] font-ui font-semibold text-kelme-gray-900">
                          {match.awayTeam}
                        </span>
                      </div>
                      <span className="font-ui text-sm font-semibold text-kelme-red">
                        Ver marcador →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold text-kelme-gray-900">
            ¿Eres parte del torneo?
          </h2>
          <p className="mt-2 max-w-2xl font-body text-kelme-gray-600">
            Si ya tienes cuenta asignada por la organización, ingresa con tu email y contraseña.
            Si aún no estás inscrito, contacta al administrador de tu liga para obtener acceso.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="card-kelme p-6 transition-colors hover:border-kelme-red/40"
              >
                <h3 className="font-ui font-semibold text-kelme-gray-900">{feature.title}</h3>
                <p className="mt-2 font-body text-sm text-kelme-gray-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-kelme-border bg-kelme-surface">
          <div className="mx-auto max-w-5xl px-4 py-12 text-center">
            <h2 className="font-display text-xl font-bold text-kelme-gray-900">
              ¿Listo para entrar?
            </h2>
            <p className="mt-2 font-body text-kelme-gray-600">
              Accede con las credenciales que te entregó la organización del torneo.
            </p>
            <Link href="/login" className="btn-kelme mt-6 inline-block">
              Iniciar sesión
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-kelme-border bg-kelme-surface py-6">
        <div className="mx-auto max-w-5xl px-4 text-center font-ui text-xs text-kelme-gray-400">
          © {new Date().getFullYear()} Torneos Kelme · KELME
        </div>
      </footer>
    </div>
  )
}

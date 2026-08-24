import Link from 'next/link'
import { ShareOrgLink } from '@/components/marketing/ShareOrgLink'
import { matchStatusBadgeClass, matchStatusLabel } from '@/lib/match-status-ui'
import type { OrgPublicLanding as OrgPublicLandingData } from '@/lib/org-public-landing'

function orgMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function PlayerRanking({
  eyebrow,
  title,
  items,
  valueKey,
}: {
  eyebrow: string
  title: string
  items: Array<{ name: string; goals?: number; assists?: number }>
  valueKey: 'goals' | 'assists'
}) {
  return (
    <div>
      <p className="font-ui text-[11px] font-black uppercase tracking-[0.13em] text-[#8A938C]">
        {eyebrow}
      </p>
      <h2 className="font-display mt-1 text-2xl font-semibold uppercase tracking-wide text-[#E8E4D8]">
        {title}
      </h2>
      <ol className="mt-8 space-y-3">
        {items.map((player, index) => (
          <li
            key={`${player.name}-${index}`}
            className="card-kelme flex items-center justify-between gap-4 px-5 py-4"
          >
            <div className="flex items-center gap-4">
              <span className="font-data w-6 text-center text-sm font-bold text-[#8A938C]">
                {index + 1}
              </span>
              <span className="font-ui font-semibold text-[#E8E4D8]">{player.name}</span>
            </div>
            <span className="font-data text-lg font-bold text-org-primary">
              {player[valueKey] ?? 0}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function OrgPublicLanding({ data }: { data: OrgPublicLandingData }) {
  const { organization, live, nextMatch, results, scorers, assists } = data
  const slug = organization.slug
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/${slug}`)}`
  const firstLive = live[0]
  const isEmpty = live.length === 0 && !nextMatch && results.length === 0

  return (
    <main className="flex-1">
      <section className="border-b border-[#2A3A32] bg-[#0B1210]">
        <div className="mx-auto max-w-5xl px-4 py-16 md:py-20">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            {organization.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organization.logoUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-2xl border border-[#2A3A32] object-cover"
              />
            ) : (
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-org-primary font-display text-2xl font-black text-[#E8E4D8]">
                {orgMonogram(organization.name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-ui text-[11px] font-black uppercase tracking-[0.13em] text-[#8A938C]">
                Marcador en vivo
              </p>
              <h1 className="font-display mt-2 text-[clamp(2rem,4vw,3rem)] font-semibold uppercase leading-none tracking-wide text-[#E8E4D8]">
                {organization.name}
              </h1>
              <p className="mt-3 max-w-xl text-lg text-[#8A938C]">
                Partidos, marcador, goleadores y asistencias
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {firstLive ? (
              <Link href={`/${slug}/live/${firstLive.id}`} className="btn-kelme">
                Ver en vivo
              </Link>
            ) : null}
            <Link href={loginHref} className="btn-kelme">
              Ingresar
            </Link>
            <Link href="/register" className="btn-kelme-outline">
              Registrarse
            </Link>
            <ShareOrgLink orgName={organization.name} slug={slug} />
          </div>
        </div>
      </section>

      {isEmpty ? (
        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="card-kelme p-10 text-center">
            <p className="font-ui text-lg font-semibold text-[#E8E4D8]">
              Aún no hay partidos publicados
            </p>
            <p className="mt-2 text-sm text-[#8A938C]">
              Vuelve más tarde para ver el fixture, resultados y estadísticas.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="border-b border-[#2A3A32] bg-[#121A18]">
            <div className="mx-auto max-w-5xl px-4 py-14">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-ui text-[11px] font-black uppercase tracking-[0.13em] text-[#8A938C]">
                    Ahora
                  </p>
                  <h2 className="font-display mt-1 text-2xl font-semibold uppercase tracking-wide text-[#E8E4D8]">
                    {live.length > 0 ? 'En vivo' : 'Próximo partido'}
                  </h2>
                </div>
                {live.length > 0 ? (
                  <span className="live-pulse inline-flex items-center gap-2 rounded-full bg-[#0B1210] px-3 py-1 font-ui text-xs font-bold text-org-primary ring-1 ring-[color:var(--org-primary)]/35">
                    {live.length} en curso
                  </span>
                ) : null}
              </div>

              {live.length > 0 ? (
                <ul className="mt-8 grid gap-4">
                  {live.map((match) => (
                    <li key={match.id}>
                      <Link
                        href={`/${slug}/live/${match.id}`}
                        className="card-kelme block p-5 transition-colors hover:border-[color:var(--org-primary)]/40"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="font-ui text-xs uppercase tracking-wide text-[#8A938C]">
                            {match.label}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-ui text-xs font-semibold ${matchStatusBadgeClass(match.status)}`}
                          >
                            {match.status === 'LIVE' ? (
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-org-primary" />
                            ) : null}
                            {matchStatusLabel(match.status)}
                          </span>
                        </div>
                        <p className="font-data mt-4 text-center text-3xl font-bold tracking-tight text-[#E8E4D8] sm:text-left">
                          {match.score}
                        </p>
                        <p className="mt-3 text-right font-ui text-sm font-semibold text-org-primary">
                          Ver marcador →
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : nextMatch ? (
                <Link
                  href={`/${slug}/live/${nextMatch.id}`}
                  className="card-kelme mt-8 block p-6 transition-colors hover:border-[color:var(--org-primary)]/40"
                >
                  <p className="font-ui text-xs uppercase tracking-wide text-[#8A938C]">
                    {nextMatch.when}
                  </p>
                  <p className="mt-2 font-ui text-lg font-semibold text-[#E8E4D8]">{nextMatch.label}</p>
                  <p className="mt-1 text-sm text-[#8A938C]">{nextMatch.venue}</p>
                  <p className="mt-4 font-ui text-sm font-semibold text-org-primary">
                    Ver detalle →
                  </p>
                </Link>
              ) : (
                <div className="card-kelme mt-8 p-8 text-center">
                  <p className="font-ui font-semibold text-[#E8E4D8]">
                    No hay partidos en curso ni programados próximos
                  </p>
                </div>
              )}
            </div>
          </section>

          {results.length > 0 ? (
            <section className="mx-auto max-w-5xl px-4 py-14">
              <p className="font-ui text-[11px] font-black uppercase tracking-[0.13em] text-[#8A938C]">
                Resultados
              </p>
              <h2 className="font-display mt-1 text-2xl font-semibold uppercase tracking-wide text-[#E8E4D8]">
                Últimos partidos
              </h2>
              <ul className="mt-8 grid gap-3">
                {results.map((match) => (
                  <li key={match.id}>
                    <Link
                      href={`/${slug}/live/${match.id}`}
                      className="card-kelme flex flex-wrap items-center justify-between gap-4 p-4 transition-colors hover:border-[color:var(--org-primary)]/40"
                    >
                      <div className="min-w-0">
                        <p className="font-ui text-sm font-semibold text-[#E8E4D8]">{match.label}</p>
                        <p className="mt-1 text-xs text-[#8A938C]">{match.when}</p>
                      </div>
                      <p className="font-data shrink-0 text-xl font-bold text-[#E8E4D8]">
                        {match.score}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {scorers.length > 0 || assists.length > 0 ? (
            <section className="border-t border-[#2A3A32] bg-[#121A18]">
              <div className="mx-auto max-w-5xl px-4 py-14">
                <p className="font-ui text-[11px] font-black uppercase tracking-[0.13em] text-[#8A938C]">
                  Estadísticas
                </p>
                <h2 className="font-display mt-1 text-2xl font-semibold uppercase tracking-wide text-[#E8E4D8]">
                  Últimos 30 días
                </h2>
                <div
                  className={`mt-8 grid gap-10 ${scorers.length > 0 && assists.length > 0 ? 'md:grid-cols-2' : ''}`}
                >
                  {scorers.length > 0 ? (
                    <PlayerRanking
                      eyebrow="Goleadores"
                      title="Top 5"
                      items={scorers}
                      valueKey="goals"
                    />
                  ) : null}
                  {assists.length > 0 ? (
                    <PlayerRanking
                      eyebrow="Asistencias"
                      title="Top 5"
                      items={assists}
                      valueKey="assists"
                    />
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}

      <section className="border-t border-[#2A3A32] py-8">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <Link
            href="/"
            className="font-ui text-xs font-bold uppercase tracking-[0.12em] text-[#8A938C] hover:text-[#E8E4D8]"
          >
            Powered by LigaLab
          </Link>
        </div>
      </section>
    </main>
  )
}

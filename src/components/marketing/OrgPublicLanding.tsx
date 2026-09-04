import Link from 'next/link'
import { FormationPitch } from '@/components/lineup/FormationPitch'
import { AwardRevealGrid } from '@/components/marketing/AwardRevealCard'
import { LosLunesHomeHero } from '@/components/marketing/LosLunesHomeHero'
import { LosLunesMatchBoard } from '@/components/marketing/LosLunesMatchBoard'
import { TeamCrest } from '@/components/TeamCrest'
import { AWARDS_LOCKER_BG } from '@/lib/award-covers'
import { LOSLUNES_LOGO_PATH, LOSLUNES_SLUG } from '@/lib/org-brand'
import { matchStatusLabel } from '@/lib/match-status-ui'
import type { OrgPublicLanding as OrgPublicLandingData } from '@/lib/org-public-landing'

function FeaturedCrest({
  name,
  src,
  color,
}: {
  name: string
  src: string | null
  color: string
}) {
  return (
    <div className="mx-auto mb-3.5 flex h-[76px] w-[76px] items-center justify-center max-sm:h-[50px] max-sm:w-[50px]">
      <TeamCrest
        name={name}
        src={src}
        color={color}
        size="lg"
        fit="contain"
        className="!h-full !w-full"
      />
    </div>
  )
}

function RankingCard({
  title,
  rows,
}: {
  title: string
  rows: Array<{ name: string; value: number }>
}) {
  if (rows.length === 0) return null
  return (
    <div className="overflow-hidden rounded-[18px] border border-[#2a302d] bg-[#131615]">
      <div className="flex items-center justify-between border-b border-[#2a302d] px-[18px] py-4">
        <h3 className="m-0 font-display text-[17px] font-semibold uppercase tracking-wide">{title}</h3>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9ca59f]">
          Top 5
        </span>
      </div>
      <ol className="py-1.5">
        {rows.map((row, index) => (
          <li
            key={`${row.name}-${index}`}
            className="grid grid-cols-[34px_1fr_auto] items-center gap-3 px-[18px] py-2.5 [&+li]:border-t [&+li]:border-white/[0.045]"
          >
            <span
              className={`grid h-[26px] w-[26px] place-items-center rounded-lg text-[11px] font-extrabold ${
                index === 0 ? 'bg-org-primary text-[#0a0c0b]' : 'bg-[#1b1f1d] text-[#879089]'
              }`}
            >
              {index + 1}
            </span>
            <span className="font-ui text-sm font-bold">{row.name}</span>
            <span className="font-data text-lg font-black tabular-nums">{row.value}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function OrgPublicLanding({
  data,
  panelHref = null,
}: {
  data: OrgPublicLandingData
  panelHref?: string | null
}) {
  const { organization, featured, nextMatch, results, form, scorers, assists, awards } = data
  const slug = organization.slug
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/${slug}`)}`
  const year = new Date().getFullYear()
  const hasStats = scorers.length > 0 || assists.length > 0
  const isEmpty = !featured && !nextMatch && results.length === 0 && !hasStats && awards.length === 0
  const isLosLunes = slug === LOSLUNES_SLUG

  return (
    <div
      className={
        isLosLunes
          ? 'min-h-screen bg-black text-[#f4f5f2]'
          : 'min-h-screen bg-[#0b0d0c] text-[#f4f5f2] [background:radial-gradient(circle_at_50%_-10%,color-mix(in_srgb,var(--org-primary)_7%,transparent),transparent_28%),#0b0d0c]'
      }
    >
      {isLosLunes ? null : (
      <header
        className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0b0d0c]/86 backdrop-blur-[18px]"
      >
        <div className="mx-auto flex min-h-[72px] w-[min(1180px,calc(100%-32px))] items-center justify-between gap-6 max-sm:min-h-16">
          <Link href={`/${slug}`} className="flex items-center gap-[13px] no-underline">
            {organization.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organization.logoUrl}
                alt=""
                className={isLosLunes ? 'h-[52px] w-[52px] object-contain' : 'h-[42px] w-[42px] object-contain'}
              />
            ) : (
              <div className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-org-primary font-display text-sm font-black tracking-tight text-[#0b0d0c]">
                {organization.monogram}
              </div>
            )}
            {isLosLunes ? null : (
              <span className="flex flex-col leading-none">
                <strong className="font-ui text-sm font-extrabold tracking-[0.02em]">
                  {organization.name.toUpperCase()}
                </strong>
                <span className="mt-1 hidden text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9ca59f] sm:block">
                  Gestión deportiva
                </span>
              </span>
            )}
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <a
              href="#resultados"
              className={
                isLosLunes
                  ? 'hidden px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white hover:text-org-primary md:inline'
                  : 'hidden rounded-[10px] px-3 py-2.5 text-sm text-[#cbd0cc] hover:bg-[#171a18] hover:text-white md:inline'
              }
            >
              Partidos
            </a>
            <a
              href="#estadisticas"
              className={
                isLosLunes
                  ? 'hidden px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white hover:text-org-primary md:inline'
                  : 'hidden rounded-[10px] px-3 py-2.5 text-sm text-[#cbd0cc] hover:bg-[#171a18] hover:text-white md:inline'
              }
            >
              Estadísticas
            </a>
            <a
              href="#premios"
              className={
                isLosLunes
                  ? 'hidden px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white hover:text-org-primary md:inline'
                  : 'hidden rounded-[10px] px-3 py-2.5 text-sm text-[#cbd0cc] hover:bg-[#171a18] hover:text-white md:inline'
              }
            >
              Premios
            </a>
            {panelHref ? (
              <Link
                href={panelHref}
                className={
                  isLosLunes
                    ? 'bg-org-primary px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white'
                    : 'rounded-[10px] border border-[#2a302d] bg-[#161917] px-[15px] py-2.5 text-sm font-bold'
                }
              >
                Ir al panel
              </Link>
            ) : (
              <Link
                href={loginHref}
                className={
                  isLosLunes
                    ? 'bg-org-primary px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white'
                    : 'rounded-[10px] border border-[#2a302d] bg-[#161917] px-[15px] py-2.5 text-sm font-bold'
                }
              >
                Ingresar
              </Link>
            )}
          </nav>
        </div>
      </header>
      )}

      {isLosLunes ? (
        <LosLunesHomeHero homeHref={`/${slug}`} panelHref={panelHref} loginHref={loginHref} />
      ) : null}

      <main>
        <section className={isLosLunes ? 'pb-7 pt-8' : 'pb-7 pt-[54px] max-sm:pt-8'}>
          <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
            {isLosLunes ? null : (
            <div className="mb-[18px] flex items-end justify-between gap-6 max-md:flex-col max-md:items-start">
              <div className="flex items-center gap-5 max-sm:gap-3.5">
                {organization.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={organization.logoUrl}
                    alt=""
                    className="h-[clamp(72px,11vw,118px)] w-auto shrink-0 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,.35)]"
                  />
                ) : null}
                <div>
                  <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-org-primary">
                    <span className="h-2 w-2 rounded-full bg-org-primary shadow-[0_0_0_5px_color-mix(in_srgb,var(--org-primary)_9%,transparent)]" />
                    Marcador en vivo
                  </p>
                  <h1 className="mt-2.5 font-display text-[clamp(34px,6vw,66px)] font-semibold uppercase leading-[0.96] tracking-[-0.055em]">
                    {organization.headline.first}
                    {organization.headline.rest ? (
                      <>
                        <br />
                        {organization.headline.rest}
                      </>
                    ) : null}
                  </h1>
                </div>
              </div>
              <p className="max-w-[380px] text-[15px] text-[#9ca59f] max-sm:text-sm">
                Resultados, goleadores, asistencias y premios de {organization.name}.
              </p>
            </div>
            )}

            {featured ? (
              isLosLunes ? (
                <LosLunesMatchBoard featured={featured} slug={slug} />
              ) : (
              <article className="relative overflow-hidden rounded-3xl border border-[#2a302d] bg-[#131615] shadow-[0_18px_50px_rgba(0,0,0,.22)] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[linear-gradient(90deg,var(--org-primary),transparent_70%)]">
                <div className="flex items-center justify-between gap-3.5 border-b border-[#2a302d] px-[22px] py-[18px] max-sm:px-[15px] max-sm:py-3.5">
                  <div className="flex items-center gap-2.5 text-[13px] font-bold text-[#d8dcd9]">
                    <span>{featured.dateLine}</span>
                    <span className="max-sm:hidden">·</span>
                    <span className="max-sm:hidden">{featured.venue}</span>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1.5 text-[11px] uppercase tracking-[0.08em] ${
                      featured.status === 'FINISHED'
                        ? 'border-[color-mix(in_srgb,var(--org-primary)_42%,#2a302d)] bg-[color-mix(in_srgb,var(--org-primary)_16%,#131615)] text-org-primary'
                        : 'border-[#303632] bg-[#202421] text-[#cbd0cc]'
                    }`}
                  >
                    {matchStatusLabel(featured.status)}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-7 px-10 py-[38px] max-md:gap-3.5 max-md:px-5 max-md:py-[30px] max-sm:px-2.5 max-sm:py-7">
                  <div className="text-center">
                    <FeaturedCrest
                      name={featured.home.name}
                      src={featured.home.crestSrc}
                      color={featured.home.color}
                    />
                    <div className="text-[17px] font-extrabold tracking-[0.01em] max-sm:text-[13px]">
                      {featured.home.name.toUpperCase()}
                    </div>
                    <div className="mt-1 text-xs text-[#9ca59f] max-sm:hidden">Local</div>
                  </div>
                  <div className="min-w-[220px] text-center max-md:min-w-[160px] max-sm:min-w-[110px]">
                    <div className="font-display text-[clamp(68px,10vw,126px)] font-black leading-[0.8] tracking-[-0.08em] tabular-nums max-sm:text-[64px]">
                      {featured.homeScore} <span className="px-[0.13em] text-[#4a514d]">—</span>{' '}
                      {featured.awayScore}
                    </div>
                    <div className="mt-[18px] text-xs uppercase tracking-[0.13em] text-[#9ca59f]">
                      {featured.scoreCaption}
                    </div>
                  </div>
                  <div className="text-center">
                    <FeaturedCrest
                      name={featured.away.name}
                      src={featured.away.crestSrc}
                      color={featured.away.color}
                    />
                    <div className="text-[17px] font-extrabold tracking-[0.01em] max-sm:text-[13px]">
                      {featured.away.name.toUpperCase()}
                    </div>
                    <div className="mt-1 text-xs text-[#9ca59f] max-sm:hidden">Visita</div>
                  </div>
                </div>

                {featured.formations.some((side) => side.lineup) ? (
                  <div className="border-t border-[#2a302d] px-[22px] py-6 max-sm:px-[15px]">
                    <p className="mb-4 text-center text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9ca59f]">
                      Formaciones
                    </p>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {featured.formations.map((side) =>
                        side.lineup ? (
                          <FormationPitch
                            key={side.label}
                            variant="live"
                            lineup={side.lineup}
                            teamName={side.label}
                            crestSrc={side.crestSrc}
                            color={side.color}
                          />
                        ) : null,
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-5 border-t border-[#2a302d] px-[22px] py-5 max-sm:flex-col max-sm:items-stretch max-sm:px-[15px]">
                  {featured.mvp ? (
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full border border-[#333a36] bg-[#232824] font-display text-sm font-black text-org-primary">
                        {featured.mvp.initials}
                      </div>
                      <div>
                        <small className="block text-[11px] uppercase tracking-[0.1em] text-[#9ca59f]">
                          Figura del partido
                        </small>
                        <strong className="text-sm">{featured.mvp.name}</strong>
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}
                  <Link
                    href={`/${slug}/live/${featured.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-[11px] bg-org-primary px-4 py-3 text-[13px] font-black text-[#0a0c0b] max-sm:w-full"
                  >
                    {featured.status === 'FINISHED'
                      ? 'Ver resumen del partido →'
                      : 'Ver en vivo →'}
                  </Link>
                </div>
              </article>
              )
            ) : null}

            {scorers[0] || assists[0] || form ? (
              <div className="mb-8 mt-3.5 grid grid-cols-3 gap-3 max-sm:grid-cols-1">
                {scorers[0] ? (
                  <div className="rounded-[14px] border border-[#232824] bg-[#101311] px-[17px] py-4">
                    <div className="text-[11px] uppercase tracking-[0.1em] text-[#9ca59f]">
                      Goleador · 30 días
                    </div>
                    <div className="mt-1.5 text-base font-extrabold">{scorers[0].name}</div>
                    <div className="mt-0.5 text-xs text-org-primary">
                      {scorers[0].goals} {scorers[0].goals === 1 ? 'gol' : 'goles'}
                    </div>
                  </div>
                ) : null}
                {assists[0] ? (
                  <div className="rounded-[14px] border border-[#232824] bg-[#101311] px-[17px] py-4">
                    <div className="text-[11px] uppercase tracking-[0.1em] text-[#9ca59f]">
                      Asistencias · 30 días
                    </div>
                    <div className="mt-1.5 text-base font-extrabold">{assists[0].name}</div>
                    <div className="mt-0.5 text-xs text-org-primary">
                      {assists[0].assists} {assists[0].assists === 1 ? 'asistencia' : 'asistencias'}
                    </div>
                  </div>
                ) : null}
                {form ? (
                  <div className="rounded-[14px] border border-[#232824] bg-[#101311] px-[17px] py-4">
                    <div className="text-[11px] uppercase tracking-[0.1em] text-[#9ca59f]">
                      Últimos {form.marks.length} · {form.teamName}
                    </div>
                    <div className="mt-1.5 text-base font-extrabold">
                      {form.wins} {form.wins === 1 ? 'victoria' : 'victorias'}
                    </div>
                    <div className="mt-0.5 text-xs text-org-primary" aria-hidden>
                      {form.marks.map((mark) => (mark === 'W' ? '●' : '○')).join(' ')}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isEmpty ? (
              <div className="rounded-[18px] border border-[#2a302d] bg-[#131615] p-10 text-center">
                <p className="font-ui text-lg font-semibold">Aún no hay partidos publicados</p>
                <p className="mt-2 text-sm text-[#9ca59f]">
                  Vuelve más tarde para ver el fixture, resultados y estadísticas.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {nextMatch ? (
          <section className="py-[26px]">
            <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
              <div className="mb-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9ca59f]">
                  Ahora
                </p>
                <h2 className="mt-1 font-display text-[28px] font-semibold uppercase tracking-[-0.035em]">
                  Próximo partido
                </h2>
              </div>
              <div className="grid grid-cols-[1.25fr_.75fr] gap-5 rounded-[18px] border border-[#2a302d] bg-[#131615] p-6 max-md:grid-cols-1 max-sm:p-[18px]">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-org-primary">
                    {nextMatch.dateLine}
                    {nextMatch.sidesReady ? '' : ' · Fecha en preparación'}
                  </p>
                  <h3 className="mt-2 font-display text-[31px] font-semibold uppercase leading-none tracking-[-0.04em]">
                    {nextMatch.sidesReady
                      ? `${nextMatch.home} vs ${nextMatch.away}`
                      : 'El próximo partido se juega.'}
                  </h3>
                  <p className="mt-2 max-w-[560px] text-[#9ca59f]">
                    {nextMatch.sidesReady
                      ? `${nextMatch.venue} · ${nextMatch.time}`
                      : 'Los equipos todavía no están publicados. Cuando queden confirmados, este bloque muestra los lados y la sede.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 content-start gap-2.5 max-[420px]:grid-cols-1">
                  <div className="rounded-xl border border-[#252a27] bg-[#0e110f] p-3.5">
                    <small className="block text-[10px] uppercase tracking-[0.1em] text-[#9ca59f]">
                      Hora
                    </small>
                    <strong className="mt-1.5 block text-sm">{nextMatch.time}</strong>
                  </div>
                  <div className="rounded-xl border border-[#252a27] bg-[#0e110f] p-3.5">
                    <small className="block text-[10px] uppercase tracking-[0.1em] text-[#9ca59f]">
                      Estado
                    </small>
                    <strong className="mt-1.5 block text-sm">
                      {nextMatch.sidesReady ? 'Programado' : 'Por confirmar'}
                    </strong>
                  </div>
                  <div className="rounded-xl border border-[#252a27] bg-[#0e110f] p-3.5">
                    <small className="block text-[10px] uppercase tracking-[0.1em] text-[#9ca59f]">
                      Cancha
                    </small>
                    <strong className="mt-1.5 block text-sm">{nextMatch.venue}</strong>
                  </div>
                  <div className="rounded-xl border border-[#252a27] bg-[#0e110f] p-3.5">
                    <small className="block text-[10px] uppercase tracking-[0.1em] text-[#9ca59f]">
                      Equipos
                    </small>
                    <strong className="mt-1.5 block text-sm">
                      {nextMatch.sidesReady ? nextMatch.label : 'En preparación'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {results.length > 0 ? (
          <section id="resultados" className="scroll-mt-24 py-[26px]">
            <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
              <div className="mb-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9ca59f]">
                  Resultados
                </p>
                <h2 className="mt-1 font-display text-[28px] font-semibold uppercase tracking-[-0.035em]">
                  Últimos partidos
                </h2>
              </div>
              <div className="grid grid-cols-5 gap-2.5 max-md:grid-cols-2 max-[420px]:grid-cols-1">
                {results.map((match) => (
                  <Link
                    key={match.id}
                    href={`/${slug}/live/${match.id}`}
                    className="rounded-[14px] border border-[#2a302d] bg-[#131615] p-4 transition duration-150 hover:-translate-y-0.5 hover:border-[#414943]"
                  >
                    <div className="mb-3 text-[11px] text-[#9ca59f]">{match.dateLine}</div>
                    <div className="flex items-center justify-between gap-2.5 text-[13px]">
                      <span>{match.home}</span>
                      <strong className="text-lg">{match.homeScore}</strong>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2.5 text-[13px]">
                      <span>{match.away}</span>
                      <strong className="text-lg">{match.awayScore}</strong>
                    </div>
                    <div className="mt-[15px] border-t border-[#252a27] pt-[11px] text-[10px] uppercase tracking-[0.12em] text-[#777f7a]">
                      Finalizado
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {hasStats ? (
          <section id="estadisticas" className="scroll-mt-24 py-[26px]">
            <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
              <div className="mb-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9ca59f]">
                  Estadísticas · Últimos 30 días
                </p>
                <h2 className="mt-1 font-display text-[28px] font-semibold uppercase tracking-[-0.035em]">
                  Los que están on fire
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
                <RankingCard
                  title="⚽ Goleadores"
                  rows={scorers.map((row) => ({ name: row.name, value: row.goals }))}
                />
                <RankingCard
                  title="🎯 Asistencias"
                  rows={assists.map((row) => ({ name: row.name, value: row.assists }))}
                />
              </div>
            </div>
          </section>
        ) : null}

        {awards.length > 0 ? (
          <section id="premios" className="scroll-mt-24 py-[26px]">
            <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
              {isLosLunes ? (
                <div className="relative mb-6 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={AWARDS_LOCKER_BG}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-35"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
                  <div className="relative flex items-end justify-between gap-6 px-1 py-6 max-md:flex-col max-md:items-start">
                    <div className="min-w-0 max-w-[640px]">
                      <p className="font-display text-[12px] font-bold uppercase tracking-[0.2em] text-org-primary">
                        Premios
                      </p>
                      <h2 className="mt-2 font-display text-[clamp(32px,6vw,58px)] font-bold uppercase leading-[0.88] tracking-[-0.04em]">
                        Premios del camarín
                      </h2>
                      <p className="mt-3 max-w-[460px] text-[14px] leading-relaxed text-white/75">
                        Reconocimientos que se ganan en la cancha y se celebran en el tercer tiempo.
                      </p>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={LOSLUNES_LOGO_PATH}
                      alt=""
                      className="w-[min(150px,28vw)] shrink-0 drop-shadow-[0_12px_28px_rgba(0,0,0,.55)] max-sm:w-24"
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9ca59f]">
                    Reconocimientos
                  </p>
                  <h2 className="mt-1 font-display text-[28px] font-semibold uppercase tracking-[-0.035em]">
                    Premios del camarín
                  </h2>
                </div>
              )}
              <AwardRevealGrid awards={awards} />
            </div>
          </section>
        ) : null}
      </main>

      <footer className="mt-[42px] border-t border-[#212622] py-7 text-xs text-[#7f8882]">
        <div className="mx-auto flex w-[min(1180px,calc(100%-32px))] items-center justify-between gap-5 max-sm:flex-col max-sm:items-start">
          <div>
            © {year} {organization.name}
          </div>
          <div>
            Powered by <strong className="text-[#dfe3df]">LigaLab</strong>
          </div>
        </div>
      </footer>
    </div>
  )
}

import Link from 'next/link'
import { TeamCrest } from '@/components/TeamCrest'
import { LOSLUNES_LOGO_PATH } from '@/lib/org-brand'

type ResultMatch = {
  id: string
  dateLine: string
  home: string
  away: string
  homeScore: number
  awayScore: number
}

function kitColor(name: string): string {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/(blanco|white)/.test(normalized)) return '#F5F5F5'
  if (/(negro|black)/.test(normalized)) return '#2A2A2A'
  return '#888888'
}

function scoreClass(score: number, other: number): string {
  return score > other ? 'text-org-primary' : 'text-white'
}

function resultWhen(dateLine: string) {
  return dateLine.replace(/\s*·\s*/g, '  ')
}

function TeamLine({
  name,
  score,
  other,
  size,
}: {
  name: string
  score: number
  other: number
  size: 'lg' | 'sm'
}) {
  return (
    <div
      className={`grid w-full items-center ${
        size === 'lg'
          ? 'h-12 grid-cols-[3rem_minmax(0,1fr)_3.25rem] gap-3'
          : 'h-8 grid-cols-[2rem_minmax(0,1fr)_1.75rem] gap-2.5'
      }`}
    >
      <span className={`shrink-0 ${size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'}`}>
        <TeamCrest
          name={name}
          color={kitColor(name)}
          size={size === 'lg' ? 'md' : 'sm'}
          className="!h-full !w-full"
        />
      </span>
      <span
        className={`min-w-0 truncate font-display font-bold uppercase italic leading-none text-white ${
          size === 'lg' ? 'text-[34px] tracking-[-0.04em] max-sm:text-[24px]' : 'text-[15px] tracking-[-0.03em]'
        }`}
      >
        {name}
      </span>
      <strong
        className={`text-right font-display font-bold italic leading-none tabular-nums ${
          size === 'lg' ? 'text-[48px] max-sm:text-[34px]' : 'text-[22px]'
        } ${scoreClass(score, other)}`}
      >
        {score}
      </strong>
    </div>
  )
}

function PitchWatermark() {
  return (
    <svg
      className="pointer-events-none absolute inset-[18px] h-[calc(100%-36px)] w-[calc(100%-36px)] opacity-[0.1]"
      viewBox="0 0 160 220"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <rect x="8" y="8" width="144" height="204" fill="none" stroke="#cfcfcf" strokeWidth="1.2" />
      <line x1="8" y1="110" x2="152" y2="110" stroke="#cfcfcf" strokeWidth="1" />
      <circle cx="80" cy="110" r="22" fill="none" stroke="#cfcfcf" strokeWidth="1" />
      <rect x="36" y="8" width="88" height="30" fill="none" stroke="#cfcfcf" strokeWidth="1" />
      <rect x="36" y="182" width="88" height="30" fill="none" stroke="#cfcfcf" strokeWidth="1" />
    </svg>
  )
}

function FeaturedResultCard({ match, href }: { match: ResultMatch; href: string }) {
  return (
    <Link
      href={href}
      className="relative grid h-full min-h-[280px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101010] px-6 py-5 shadow-[inset_3px_0_0_var(--org-primary),-10px_0_32px_rgba(245,127,32,0.22)] transition hover:brightness-110 max-sm:min-h-[240px]"
    >
      <PitchWatermark />
      <span
        className="pointer-events-none absolute bottom-2 right-1 z-0 select-none font-display text-[42px] font-black uppercase italic leading-none tracking-[-0.07em] max-sm:text-[32px]"
        style={{
          color: 'transparent',
          WebkitTextStroke: '1px rgba(255,255,255,0.05)',
        }}
      >
        Más reciente
      </span>

      <div className="relative z-10 flex items-center justify-between">
        <span className="font-display text-[12px] font-bold uppercase tracking-[0.14em] text-org-primary">
          {resultWhen(match.dateLine)}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOSLUNES_LOGO_PATH} alt="" className="h-7 w-7 object-contain" />
      </div>

      <div className="relative z-10 flex w-full flex-col justify-center gap-6">
        <TeamLine name={match.home} score={match.homeScore} other={match.awayScore} size="lg" />
        <TeamLine name={match.away} score={match.awayScore} other={match.homeScore} size="lg" />
      </div>

      <p className="relative z-10 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-org-primary">
        Finalizado
      </p>
    </Link>
  )
}

function ResultMiniCard({ match, href }: { match: ResultMatch; href: string }) {
  return (
    <Link
      href={href}
      className="grid h-full grid-rows-[auto_1fr_auto] rounded-2xl border border-white/[0.08] bg-[#161616] px-4 py-3.5 transition hover:border-white/20"
    >
      <span className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-org-primary">
        {resultWhen(match.dateLine)}
      </span>
      <div className="flex w-full flex-col justify-center gap-3">
        <TeamLine name={match.home} score={match.homeScore} other={match.awayScore} size="sm" />
        <TeamLine name={match.away} score={match.awayScore} other={match.homeScore} size="sm" />
      </div>
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-org-primary">
        Finalizado
      </p>
    </Link>
  )
}

export function LosLunesResults({
  results,
  slug,
}: {
  results: ResultMatch[]
  slug: string
}) {
  const [featured, ...rest] = results
  if (!featured) return null

  return (
    <section id="resultados" className="scroll-mt-24 bg-[#0a0a0a] py-10">
      <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
        <div className="mb-7">
          <p className="font-display text-[12px] font-bold uppercase tracking-[0.22em] text-org-primary">
            Resultados
          </p>
          <h2 className="mt-2 font-display text-[clamp(34px,5.4vw,52px)] font-bold uppercase italic leading-[0.88] tracking-[-0.045em] text-white">
            Últimos partidos
          </h2>
        </div>

        <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,0.78fr)_1.22fr]">
          <FeaturedResultCard match={featured} href={`/${slug}/live/${featured.id}`} />
          {rest.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
              {rest.map((match) => (
                <ResultMiniCard key={match.id} match={match} href={`/${slug}/live/${match.id}`} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

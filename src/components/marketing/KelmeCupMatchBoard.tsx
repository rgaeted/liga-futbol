import Link from 'next/link'
import { FormationPitch } from '@/components/lineup/FormationPitch'
import { TeamCrest } from '@/components/TeamCrest'
import { matchStatusLabel } from '@/lib/match-status-ui'
import type { LineupView } from '@/lib/match-lineup'

type Featured = {
  id: string
  status: 'LIVE' | 'HALFTIME' | 'FINISHED'
  dateLine: string
  venue: string
  home: { name: string; crestSrc: string | null; color: string }
  away: { name: string; crestSrc: string | null; color: string }
  homeScore: number
  awayScore: number
  scoreCaption: string
  mvp: { name: string; initials: string } | null
  formations: Array<{
    label: string
    crestSrc: string | null
    color: string
    lineup: LineupView | null
  }>
}

export function KelmeCupMatchBoard({ featured, slug }: { featured: Featured; slug: string }) {
  return (
    <article className="overflow-hidden rounded-[24px] border-2 border-[#1A7AE8]/35 bg-white shadow-[0_16px_36px_rgba(26,122,232,0.12)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#1A7AE8]/15 bg-[#eef6ff] px-5 py-3.5 max-sm:px-4">
        <p className="text-[13px] font-bold text-[#123a6b]">
          {featured.dateLine}
          <span className="hidden sm:inline"> · {featured.venue}</span>
        </p>
        <span className="rounded-full bg-[#1A7AE8] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white">
          {matchStatusLabel(featured.status)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-8 max-sm:gap-2 max-sm:px-3 max-sm:py-6">
        <div className="text-center">
          <div className="mx-auto mb-2 h-16 w-16 max-sm:h-12 max-sm:w-12">
            <TeamCrest
              name={featured.home.name}
              src={featured.home.crestSrc}
              color={featured.home.color}
              size="lg"
              fit="contain"
              className="!h-full !w-full"
            />
          </div>
          <p className="font-display text-sm font-bold uppercase tracking-wide text-[#123a6b] max-sm:text-xs">
            {featured.home.name}
          </p>
        </div>
        <div className="min-w-[140px] text-center max-sm:min-w-[96px]">
          <p className="font-display text-[clamp(48px,8vw,88px)] font-bold leading-none tracking-[-0.06em] text-[#0B3D8F]">
            {featured.homeScore}
            <span className="mx-1 text-[#1A7AE8]">–</span>
            {featured.awayScore}
          </p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4d6790]">
            {featured.scoreCaption}
          </p>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-2 h-16 w-16 max-sm:h-12 max-sm:w-12">
            <TeamCrest
              name={featured.away.name}
              src={featured.away.crestSrc}
              color={featured.away.color}
              size="lg"
              fit="contain"
              className="!h-full !w-full"
            />
          </div>
          <p className="font-display text-sm font-bold uppercase tracking-wide text-[#123a6b] max-sm:text-xs">
            {featured.away.name}
          </p>
        </div>
      </div>

      {featured.formations.some((side) => side.lineup) ? (
        <div className="border-t border-[#1A7AE8]/15 px-5 py-5 max-sm:px-3">
          <p className="mb-3 text-center font-display text-[11px] font-bold uppercase tracking-[0.16em] text-[#1A7AE8]">
            Formaciones
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
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

      <div className="flex items-center justify-between gap-4 border-t border-[#1A7AE8]/15 px-5 py-4 max-sm:flex-col max-sm:items-stretch">
        {featured.mvp ? (
          <p className="text-sm font-semibold text-[#123a6b]">
            Figura · {featured.mvp.name}
          </p>
        ) : (
          <span />
        )}
        <Link
          href={`/${slug}/live/${featured.id}`}
          className="inline-flex items-center justify-center rounded-full bg-[#1A7AE8] px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.12em] text-white max-sm:w-full"
        >
          {featured.status === 'FINISHED' ? 'Ver resumen' : 'Ver en vivo'}
        </Link>
      </div>
    </article>
  )
}

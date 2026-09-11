import Link from 'next/link'
import { KelmeCupBrushBackdrop, KelmePawMark } from '@/components/marketing/KelmeCupBrush'
import {
  KELME_CUP,
  KELME_CUP_HUDDLE_PATH,
  KELME_CUP_SHIELD_PATH,
} from '@/lib/org-brand'

export function KelmeCupHomeHero({
  homeHref,
  panelHref,
  loginHref,
}: {
  homeHref: string
  panelHref?: string | null
  loginHref: string
}) {
  const ctaHref = panelHref ?? loginHref
  const ctaLabel = panelHref ? 'Ir al panel' : 'Ingresar'

  return (
    <section className="relative isolate overflow-hidden bg-[#f4f9ff] text-[#123a6b]">
      <KelmeCupBrushBackdrop />
      <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#1A7AE8]/10 blur-3xl" />

      <nav className="relative z-20 mx-auto flex w-[min(1180px,calc(100%-32px))] items-center justify-between gap-4 pt-6">
        <Link href={homeHref} className="flex items-center gap-2 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={KELME_CUP_SHIELD_PATH} alt="" className="h-12 w-12 object-contain mix-blend-multiply sm:h-14 sm:w-14" />
          <span className="font-display text-sm font-bold uppercase tracking-[0.14em] text-[#0B3D8F]">
            Kelme Cup
          </span>
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <a
            href="#invitacion"
            className="hidden font-display text-[12px] font-bold uppercase tracking-[0.16em] text-[#123a6b] md:inline"
          >
            El torneo
          </a>
          <a
            href="#resultados"
            className="hidden font-display text-[12px] font-bold uppercase tracking-[0.16em] text-[#123a6b] md:inline"
          >
            Partidos
          </a>
          <Link
            href={ctaHref}
            className="rounded-full bg-[#1A7AE8] px-4 py-2 font-display text-[12px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_8px_18px_rgba(26,122,232,0.35)]"
          >
            {ctaLabel}
          </Link>
        </div>
      </nav>

      <div className="relative z-10 mx-auto grid w-[min(1180px,calc(100%-32px))] items-center gap-10 pb-14 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-20 lg:pt-10">
        <div>
          <p className="inline-block -rotate-2 rounded-md bg-[#1A7AE8] px-3 py-1 font-script text-[clamp(28px,5vw,44px)] font-semibold leading-none text-white shadow-[4px_6px_0_#0B3D8F]">
            {KELME_CUP.region}
          </p>
          <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-[0.22em] text-[#1A7AE8]">
            {KELME_CUP.kicker}
          </p>
          <p className="mt-3 max-w-[34rem] font-script text-[clamp(26px,4.4vw,40px)] font-semibold leading-[1.05] text-[#1A7AE8]">
            {KELME_CUP.tagline}
          </p>

          <div className="mt-5 flex flex-wrap items-end gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={KELME_CUP_SHIELD_PATH}
              alt="Escudo Kelme Cup"
              className="h-[clamp(120px,22vw,196px)] w-auto object-contain mix-blend-multiply drop-shadow-[0_16px_28px_rgba(11,61,143,0.25)]"
            />
            <div>
              <h1 className="font-display text-[clamp(52px,10vw,92px)] font-bold uppercase leading-[0.8] tracking-[-0.04em] text-[#111]">
                Kelme
              </h1>
              <p className="mt-1 flex items-center gap-2 font-script text-[clamp(48px,9vw,84px)] font-bold leading-none text-[#1A7AE8]">
                Cup
                <KelmePawMark className="h-8 w-8 text-[#111] sm:h-10 sm:w-10" />
              </p>
            </div>
          </div>

          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#1A7AE8]/25 bg-white/80 px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#0B3D8F]">
            <span aria-hidden>⚽</span> {KELME_CUP.subtitle}
          </p>
          <p className="mt-4 max-w-[34rem] text-[15px] leading-relaxed text-[#2c4a73] sm:text-base">
            {KELME_CUP.blurb}
          </p>
          <p className="mt-4 max-w-[16rem] font-script text-xl font-semibold leading-tight text-[#1A7AE8] sm:text-2xl">
            {KELME_CUP.values}
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[540px]">
          <div
            className="absolute -inset-3 rounded-[28px] bg-[#1A7AE8]"
            style={{
              clipPath:
                'polygon(4% 8%, 18% 2%, 48% 6%, 78% 1%, 97% 10%, 100% 42%, 96% 78%, 86% 98%, 52% 94%, 18% 100%, 2% 82%, 0 38%)',
            }}
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_rgba(11,61,143,0.28)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={KELME_CUP_HUDDLE_PATH}
              alt="Jugadores de la Kelme Cup en ronda antes del partido"
              className="aspect-[4/3] w-full object-cover object-[center_30%]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

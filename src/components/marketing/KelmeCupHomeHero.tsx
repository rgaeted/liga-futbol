import type { ReactNode } from 'react'
import Link from 'next/link'
import { KelmePawMark } from '@/components/marketing/KelmeCupBrush'
import {
  KELME_CUP,
  KELME_CUP_HERO_PATH,
  KELME_CUP_SHIELD_PATH,
} from '@/lib/org-brand'

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </svg>
  )
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M10 17h4" />
    </svg>
  )
}

function TeamIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <circle cx="12" cy="8" r="2.8" />
      <circle cx="5.5" cy="10" r="2.2" />
      <circle cx="18.5" cy="10" r="2.2" />
      <path d="M7 19c0-3 2.2-5 5-5s5 2 5 5M1.5 18c0-2.2 1.6-3.7 4-3.7M22.5 18c0-2.2-1.6-3.7-4-3.7" />
    </svg>
  )
}

function PitchIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <rect x="2.5" y="5" width="19" height="14" rx="1.5" />
      <path d="M12 5v14M2.5 9.5H6v5H2.5M21.5 9.5H18v5h3.5" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  )
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
    </svg>
  )
}

const FACTS: ReadonlyArray<{ icon: ReactNode; lines: string[] }> = [
  { icon: <CalendarIcon className="h-9 w-9" />, lines: [KELME_CUP.dateLabel] },
  { icon: <PinIcon className="h-9 w-9" />, lines: [KELME_CUP.venue] },
  { icon: <ClockIcon className="h-9 w-9" />, lines: [KELME_CUP.timeLabel] },
]

const FORMAT: ReadonlyArray<{ icon: ReactNode; value?: string; label: string }> = [
  { icon: <TeamIcon className="h-9 w-9" />, value: '4', label: 'categorías' },
  { icon: <PitchIcon className="h-9 w-9" />, label: 'Fútbol 7' },
  { icon: <TeamIcon className="h-9 w-9" />, value: '4 equipos', label: 'por categoría' },
  { icon: <SwapIcon className="h-9 w-9" />, label: 'Cambios ilimitados' },
]

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
    <section className="relative isolate bg-[#f4f9ff] text-[#123a6b]">
      <div className="relative isolate overflow-hidden bg-[#0a1f44] pb-28 sm:pb-32">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={KELME_CUP_HERO_PATH}
          alt="Jugadores de la Kelme Cup abrazados frente al volcán"
          className="absolute inset-y-0 right-0 -z-10 h-full w-full object-cover object-[60%_30%] lg:w-[68%]"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#0a1f44_0%,#0a1f44_30%,rgba(10,31,68,0.55)_52%,rgba(10,31,68,0)_75%)] max-lg:bg-[linear-gradient(180deg,rgba(10,31,68,0.85),rgba(10,31,68,0.55)_60%,rgba(10,31,68,0.35))]"
          aria-hidden
        />

        <nav className="relative z-20 bg-[#0a1f44]">
          <div className="mx-auto flex w-[min(1180px,calc(100%-32px))] items-center justify-between gap-4 py-3.5">
            <Link href={homeHref} className="flex items-center gap-4 text-white no-underline">
              <span className="text-[26px] font-extrabold tracking-tight">
                <span className="mr-1 text-[#1A9CF0]">{'//'}</span>LigaLab
              </span>
              <span className="hidden h-8 w-px bg-white/30 sm:block" aria-hidden />
              <span className="hidden items-center gap-2 sm:flex">
                <KelmePawMark className="h-7 w-7 text-white" />
                <span className="font-display text-xl font-bold uppercase tracking-[0.14em]">Kelme</span>
              </span>
            </Link>
            <div className="flex items-center gap-4 sm:gap-7">
              <a
                href={homeHref}
                className="hidden border-b-[3px] border-[#1A9CF0] pb-0.5 text-[17px] font-bold text-white md:inline"
              >
                Kelme Cup
              </a>
              <a href="#fixture" className="hidden text-[17px] font-semibold text-white/90 hover:text-white md:inline">
                Partidos
              </a>
              <a href="#posiciones" className="hidden text-[17px] font-semibold text-white/90 hover:text-white md:inline">
                Posiciones
              </a>
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-xl border border-white/80 px-4 py-2 text-[15px] font-semibold text-white"
              >
                <UserIcon className="h-5 w-5" />
                {ctaLabel}
              </Link>
            </div>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid w-[min(1180px,calc(100%-32px))] items-center gap-6 pt-10 sm:grid-cols-[auto_1fr] sm:gap-10 lg:pt-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={KELME_CUP_SHIELD_PATH}
            alt="Escudo Kelme Cup"
            className="h-[clamp(150px,20vw,260px)] w-auto object-contain drop-shadow-[0_16px_28px_rgba(0,0,0,0.45)]"
          />
          <div className="max-w-[640px] text-white">
            <p className="flex items-center gap-2 text-xl font-bold">
              <PinIcon className="h-6 w-6 text-[#1A9CF0]" />
              {KELME_CUP.region}
            </p>
            <p className="mt-4 border-l-4 border-[#4b9deb] pl-3 text-[13px] font-extrabold uppercase tracking-[0.19em] text-[#87c4ff]">
              {KELME_CUP.kicker}
            </p>
            <h1 className="mt-4 font-display text-[clamp(80px,11vw,160px)] font-black uppercase italic leading-[0.83] tracking-[-0.035em] [text-shadow:0_2px_15px_rgba(7,16,32,0.4)]">
              Kelme <span className="block tracking-[0.005em] text-[#4b9deb]">Cup</span>
            </h1>
            <p className="mt-6 font-display text-[clamp(28px,3.5vw,48px)] font-bold uppercase leading-none tracking-[0.035em]">
              {KELME_CUP.subtitle}
            </p>
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.125em] text-[#d8e4f7]">{KELME_CUP.values}</p>
            <a
              href="#fixture"
              className="mt-7 inline-flex items-center gap-4 rounded-[4px] bg-white px-6 py-4 text-sm font-extrabold uppercase tracking-[0.04em] text-[#10244d] shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5"
            >
              Ver partidos y resultados
              <span aria-hidden>↓</span>
            </a>
          </div>
        </div>
      </div>

      {/* Tarjeta de datos clave y formato, montada sobre la foto */}
      <div className="relative z-10 mx-auto -mt-20 w-[min(1180px,calc(100%-32px))] rounded-[28px] bg-white p-5 shadow-[0_20px_50px_rgba(6,24,58,0.25)] sm:-mt-24 sm:p-7">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-0">
          <div className="lg:pr-8">
            <h2 className="flex items-center gap-3 font-ui text-2xl font-extrabold text-[#0a1f44]">
              <CalendarIcon className="h-8 w-8 text-[#1A7AE8]" />
              Datos clave
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {FACTS.map((fact) => (
                <div
                  key={fact.lines[0]}
                  className="flex items-center gap-3 rounded-2xl border border-[#dbe5f2] bg-[#f4f6fa] p-3.5"
                >
                  <span className="shrink-0 text-[#1A7AE8]">{fact.icon}</span>
                  <p className="text-[15px] font-bold leading-tight text-[#0a1f44]">{fact.lines[0]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#dbe5f2] pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <h2 className="flex items-center gap-3 font-ui text-2xl font-extrabold text-[#0a1f44]">
              <TrophyIcon className="h-8 w-8 text-[#1A7AE8]" />
              Formato de competencia
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {FORMAT.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center justify-center rounded-2xl bg-[#e6f1fe] px-2 py-4 text-center text-[#0a1f44]"
                >
                  <span className="text-[#1A7AE8]">{item.icon}</span>
                  {item.value ? (
                    <span className="mt-1 text-lg font-extrabold leading-tight">{item.value}</span>
                  ) : null}
                  <span className="mt-1 text-[15px] font-bold leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

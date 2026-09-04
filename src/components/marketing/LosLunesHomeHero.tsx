import Link from 'next/link'
import { LOSLUNES_HERO_PATH, LOSLUNES_LOGO_PATH } from '@/lib/org-brand'

export function LosLunesHomeHero({
  homeHref,
  panelHref,
  loginHref,
}: {
  homeHref: string
  panelHref?: string | null
  loginHref: string
}) {
  const ctaHref = panelHref ?? loginHref
  const ctaLabel = panelHref ? 'Ir al panel' : 'Únete a la familia'

  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOSLUNES_HERO_PATH}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[72%_30%] brightness-[0.68] contrast-[1.1]"
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="#000"
          d="M0 0 H540 C610 90 420 170 500 290 C580 420 360 520 430 640 C490 740 280 860 320 1000 H0 Z"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/55 to-transparent md:via-black/20 md:to-transparent" />

      <nav className="absolute right-[max(18px,calc((100vw-1180px)/2))] top-6 z-20 flex items-center gap-6 sm:top-8">
        <Link
          href={homeHref}
          className="font-display text-[13px] font-bold uppercase tracking-[0.22em] text-org-primary"
        >
          Inicio
          <span className="mx-auto mt-1.5 block h-[2px] w-9 bg-org-primary" />
        </Link>
        <a
          href="#resultados"
          className="hidden font-display text-[13px] font-bold uppercase tracking-[0.22em] text-white md:inline"
        >
          Partidos
        </a>
        <Link
          href={ctaHref}
          className="font-display text-[13px] font-bold uppercase tracking-[0.22em] text-white"
        >
          {panelHref ? 'Panel' : 'Ingresar'}
        </Link>
      </nav>

      {/* Escudo sobre el rasgón, sin tapar el titular */}
      <div className="pointer-events-none absolute left-[min(52%,560px)] top-10 z-20 w-[clamp(112px,12.5vw,168px)] -translate-x-1/2 drop-shadow-[0_16px_36px_rgba(0,0,0,.6)] max-md:left-5 max-md:top-[4.5rem] max-md:w-[108px] max-md:translate-x-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOSLUNES_LOGO_PATH}
          alt="Escudo Fútbol de los Lunes"
          className="h-auto w-full"
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-[min(1280px,100%)] items-center px-[max(20px,calc((100vw-1180px)/2))]">
        <div className="max-w-[min(440px,46vw)] pt-40 pb-16 max-md:max-w-[520px] max-md:pt-44">
          <h1 className="font-display text-[clamp(46px,8vw,90px)] font-bold uppercase italic leading-[0.84] tracking-[-0.03em] text-white">
            Más que
            <br />
            un juego.
            <br />
            <span className="text-org-primary">Es lunes.</span>
          </h1>
          <p className="mt-6 max-w-[400px] text-[15px] leading-relaxed text-white/88 sm:text-base">
            Fútbol de los Lunes es más que fútbol. Es la escapada de cada semana, la hermandad y
            la tradición desde 2014.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a
              href="#resultados"
              className="font-display text-[13px] font-bold uppercase tracking-[0.18em] text-org-primary"
            >
              Ver partidos
            </a>
            <Link
              href={ctaHref}
              className="font-display text-[13px] font-bold uppercase tracking-[0.18em] text-white/80 hover:text-white"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

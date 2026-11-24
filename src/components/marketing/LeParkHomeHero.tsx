import Link from 'next/link'
import { APP_LOCALE } from '@/lib/locale'

const LE_PARK_START_DATE = '2026-11-26'
const startDate = new Date(`${LE_PARK_START_DATE}T00:00:00-03:00`)
const dateLabel = new Intl.DateTimeFormat(APP_LOCALE, {
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Santiago',
}).format(startDate)

export function LeParkHomeHero({
  logoUrl,
  panelHref,
  loginHref,
  hasStats,
  today,
}: {
  logoUrl: string | null
  panelHref: string | null
  loginHref: string
  hasStats: boolean
  today: Date
}) {
  const beforeKickoff = today < startDate
  const contactMessage = beforeKickoff
    ? 'Hola, me gustaría consultar por el cupo para Liga Le Park +35 Verano.'
    : 'Hola, me gustaría consultar por Liga Le Park +35 Verano.'
  const whatsappHref = `https://wa.me/56957588141?text=${encodeURIComponent(contactMessage)}`

  return (
    <>
      <header className="border-b border-[#ecc477]/20 bg-[#100e0b]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:min-h-[76px] sm:px-8">
          <Link href="/liga-le-park" className="font-serif text-sm font-bold uppercase tracking-widest text-[#f3d498] sm:text-lg">
            Liga Le Park
          </Link>
          <nav aria-label="Navegación de Liga Le Park" className="flex items-center gap-4 text-sm sm:gap-7">
            <a href="#partidos" className="hidden hover:text-[#f3d498] sm:inline">Partidos</a>
            {hasStats && <a href="#estadisticas" className="hidden hover:text-[#f3d498] md:inline">Estadísticas</a>}
            <Link href={panelHref ?? loginHref} className="whitespace-nowrap rounded-md border border-[#ecc477]/40 px-3 py-2 font-semibold hover:bg-[#ecc477]/10">
              {panelHref ? 'Ir al panel' : 'Ingresar'}
            </Link>
          </nav>
        </div>
      </header>
      <section
        aria-labelledby="le-park-title"
        className="relative isolate overflow-hidden border-b border-[#ecc477]/25 bg-[#100e0b] bg-[url('/branding/portada-cancha.jpg')] bg-cover bg-center"
      >
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#0e0b08_0%,#100d09e8_40%,#100d0966_100%),linear-gradient(0deg,#100e0b,transparent_70%)]" />
        <div aria-hidden="true" className="absolute -right-28 top-12 -z-10 h-12 w-[420px] rotate-45 border-y border-[#ecc477]/50 bg-[#ecc477]/15" />
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 sm:px-8 md:grid-cols-[1fr_0.8fr] md:py-20">
          <div className="md:col-start-1 md:row-start-1">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-[#f3d498]">Fútbol en Puerto Varas</p>
            <h1 id="le-park-title" className="font-serif text-[clamp(2.1rem,5vw,4.4rem)] font-bold uppercase leading-none tracking-tight">
              Liga Le Park
              <span className="mt-2 block text-[clamp(5rem,13vw,10rem)] leading-[0.85] tracking-tighter text-[#ecc477]">+35</span>
              <span className="mt-4 block text-xl tracking-[0.28em] text-[#f3d498] sm:text-2xl">Verano</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#eee6d7]">
              Fútbol entre amigos, buen nivel de juego y competencia sana.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-l-2 border-[#ecc477] pl-4">
              {beforeKickoff && <strong className="text-[#f3d498]">Último cupo disponible</strong>}
              <span>Inicio <time dateTime={LE_PARK_START_DATE} className="font-semibold">{dateLabel}</time></span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={whatsappHref} className="rounded-md bg-[#ecc477] px-5 py-3 font-bold text-[#161009] hover:bg-[#f7d897]">
                {beforeKickoff ? 'Inscríbete por WhatsApp' : 'Consulta por WhatsApp'}
              </a>
              <a href="#partidos" className="rounded-md border border-[#ecc477]/40 bg-black/35 px-5 py-3 font-semibold hover:bg-black/70">
                Ver partidos
              </a>
            </div>
            <p className="mt-3 text-sm text-[#eee6d7]">+56 9 5758 8141</p>
          </div>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Escudo de Liga Le Park"
              className="mx-auto row-start-1 aspect-square w-28 object-contain drop-shadow-[0_12px_32px_#000] md:col-start-2 md:w-full md:max-w-[340px]"
            />
          )}
        </div>
      </section>
    </>
  )
}

import type { SponsorTone } from '@/components/marketing/sponsors/SponsorStrip'
import { sponsorClickHref, type LandingSponsor, type LandingSponsors } from '@/lib/sponsors/landing'

const TONES = {
  // Estadio LED: fondo azul marino con luces, vallas claras con borde luminoso.
  kelme: {
    section: 'relative isolate overflow-hidden bg-[linear-gradient(132deg,#081735,#163261_62%,#0b1b3c)] text-white',
    glow: 'bg-[radial-gradient(circle_at_85%_0%,rgba(67,141,240,0.35),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(26,122,232,0.22),transparent_50%),repeating-linear-gradient(90deg,transparent_0,transparent_120px,rgba(255,255,255,0.03)_121px,transparent_122px)]',
    kicker: 'border-[#4b9deb] text-[#9fc9ff]',
    title: 'text-white',
    lead: 'text-[#d6dfed]',
    board:
      'border-[#6aa9ff] bg-[#f9fbff] text-[#0d2349] shadow-[inset_0_0_0_5px_#d8e8ff,0_0_29px_rgba(43,120,217,0.35)]',
    boardMain:
      'border-[#6aa9ff] bg-[#f9fbff] text-[#0d2349] shadow-[inset_0_0_0_5px_#d8e8ff,0_0_44px_rgba(67,141,240,0.55)]',
    diagonal: 'bg-[linear-gradient(115deg,transparent_0%,rgba(67,141,240,0.10)_100%)]',
    logoBox: 'bg-[#f2f4f7]',
    meta: 'text-[#2462a8]',
    name: 'text-[#0d2349]',
    text: 'text-[#0B3D8F]',
    tagline: 'text-[#4a5a75]',
    button: 'bg-[#1e5bbb] text-white hover:bg-[#0B3D8F] focus-visible:outline-[#1e5bbb]',
    footer: 'text-[#aac2e7]',
  },
  org: {
    section: 'relative isolate overflow-hidden bg-[#0b0d0c] text-[#f4f5f2]',
    glow: 'bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.06),transparent_55%)]',
    kicker: 'border-[var(--org-primary)] text-[#9ca59f]',
    title: 'text-[#f4f5f2]',
    lead: 'text-[#9ca59f]',
    board: 'border-[#2a302d] bg-[#161917] text-[#f4f5f2]',
    boardMain: 'border-[var(--org-primary)] bg-[#161917] text-[#f4f5f2] shadow-[0_0_30px_rgba(255,255,255,0.08)]',
    diagonal: 'bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.04)_100%)]',
    logoBox: 'bg-[#0e110f]',
    meta: 'text-[#9ca59f]',
    name: 'text-[#f4f5f2]',
    text: 'text-[#f4f5f2]',
    tagline: 'text-[#9ca59f]',
    button: 'bg-org-primary text-[#0a0c0b] hover:brightness-110 focus-visible:outline-[var(--org-primary)]',
    footer: 'text-[#9ca59f]',
  },
} as const

/** Botón dentro de la valla: el del auspiciador si lo configuró, o "Conoce a …" hacia su sitio web. */
function BoardLink({ sponsor, className }: { sponsor: LandingSponsor; className: string }) {
  let to: 'cta' | 'web'
  let label: string
  if (sponsor.hasCta && sponsor.ctaLabel) {
    to = 'cta'
    label = sponsor.ctaLabel
  } else if (sponsor.hasWebsite) {
    to = 'web'
    label = `Conoce a ${sponsor.name}`
  } else {
    return null
  }
  return (
    <a
      href={sponsorClickHref(sponsor.id, to)}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold uppercase tracking-[0.05em] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 ${className}`}
    >
      {label}
      <span aria-hidden>↗</span>
    </a>
  )
}

function Billboard({
  sponsor,
  tone,
  featured,
}: {
  sponsor: LandingSponsor
  tone: SponsorTone
  featured: boolean
}) {
  const styles = TONES[tone]
  return (
    <article
      className={`relative isolate grid items-center gap-5 overflow-hidden rounded-2xl border-2 p-5 sm:p-6 md:min-h-[190px] md:grid-cols-[minmax(200px,240px)_1fr_auto] md:gap-8 md:px-8 ${
        featured ? styles.boardMain : styles.board
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 -z-10 ${styles.diagonal}`} aria-hidden />
      <div className={`flex h-36 items-center justify-center rounded-xl p-4 sm:h-40 ${styles.logoBox}`}>
        {sponsor.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sponsor.logoUrl}
            alt={sponsor.name}
            loading="lazy"
            className={`h-28 w-auto max-w-full object-contain sm:h-32 ${tone === 'kelme' ? 'mix-blend-multiply' : ''}`}
          />
        ) : (
          <span className={`font-display text-3xl font-black uppercase italic tracking-wide ${styles.text}`}>
            {sponsor.name}
          </span>
        )}
      </div>
      <div className="min-w-0 space-y-2">
        <p className={`text-xs font-extrabold uppercase tracking-[0.16em] ${styles.meta}`}>
          {featured ? 'Auspiciador principal' : 'Socio del torneo'}
        </p>
        {sponsor.logoUrl ? (
          <h3
            className={`font-display text-[clamp(36px,5vw,64px)] font-black uppercase italic leading-none ${styles.name}`}
          >
            {sponsor.name}
          </h3>
        ) : null}
        {sponsor.tagline ? (
          <p className={`text-base font-semibold leading-snug sm:text-lg ${styles.tagline}`}>{sponsor.tagline}</p>
        ) : null}
      </div>
      <BoardLink sponsor={sponsor} className={`w-full md:w-auto ${styles.button}`} />
    </article>
  )
}

/** Sección "Nuestros auspiciadores": una valla LED horizontal por auspiciador, con logo, nombre, lema y botón dentro del marco. */
export function SponsorCards({ sponsors, tone }: { sponsors: LandingSponsors; tone: SponsorTone }) {
  if (sponsors.main.length === 0 && sponsors.official.length === 0) return null
  const styles = TONES[tone]

  return (
    <section id="auspiciadores" className={`scroll-mt-24 py-14 sm:py-16 ${styles.section}`}>
      <div className={`absolute inset-0 -z-10 ${styles.glow}`} aria-hidden />
      <div className="mx-auto w-[min(1180px,calc(100%-32px))] space-y-8">
        <div>
          <p className={`border-l-4 pl-3 text-[13px] font-extrabold uppercase tracking-[0.19em] ${styles.kicker}`}>
            Gracias por hacerlo posible
          </p>
          <h2
            className={`mt-3 font-display text-[clamp(40px,7vw,84px)] font-black uppercase italic leading-[0.92] tracking-[-0.02em] ${styles.title}`}
          >
            Nuestros auspiciadores
          </h2>
          <p className={`mt-3 max-w-[620px] text-base sm:text-lg ${styles.lead}`}>
            Empresas que apoyan el fútbol infantil y hacen posible cada partido.
          </p>
        </div>
        <div className="space-y-4">
          {sponsors.main.map((sponsor) => (
            <Billboard key={sponsor.id} sponsor={sponsor} tone={tone} featured />
          ))}
          {sponsors.official.map((sponsor) => (
            <Billboard key={sponsor.id} sponsor={sponsor} tone={tone} featured={false} />
          ))}
        </div>
        <p className={`text-center text-xs font-bold uppercase tracking-[0.14em] ${styles.footer}`}>
          Fútbol, amistad, valores y vida sana
        </p>
      </div>
    </section>
  )
}

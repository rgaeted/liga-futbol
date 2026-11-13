import { SponsorMark } from '@/components/marketing/sponsors/SponsorMark'
import type { SponsorTone } from '@/components/marketing/sponsors/SponsorStrip'
import { sponsorClickHref, type LandingSponsor, type LandingSponsors } from '@/lib/sponsors/landing'

const TONES = {
  // Banda azul oscuro como el hero: las tarjetas blancas resaltan sobre ella.
  kelme: {
    section: 'relative isolate overflow-hidden bg-[#0a1f44] text-white',
    glow: 'bg-[radial-gradient(circle_at_85%_0%,rgba(26,156,240,0.32),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(26,122,232,0.22),transparent_50%)]',
    kicker: 'border-[#4b9deb] text-[#87c4ff]',
    title: 'text-white',
    lead: 'text-white/75',
    card: 'border-white/10 bg-white text-[#123a6b] shadow-[0_14px_34px_rgba(0,0,0,0.28)]',
    featured: 'border-[#4b9deb] bg-white text-[#123a6b] shadow-[0_18px_44px_rgba(0,0,0,0.38)] ring-4 ring-[#4b9deb]/30',
    logoBox: 'bg-[#f4f9ff]',
    badge: 'bg-[#1A7AE8] text-white',
    name: 'text-[#4d6790]',
    text: 'text-[#0B3D8F]',
    button: 'bg-[#1A7AE8] text-white hover:bg-[#0B3D8F]',
  },
  org: {
    section: 'relative isolate overflow-hidden bg-[#0b0d0c] text-[#f4f5f2]',
    glow: 'bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.06),transparent_55%)]',
    kicker: 'border-[var(--org-primary)] text-[#9ca59f]',
    title: 'text-[#f4f5f2]',
    lead: 'text-[#9ca59f]',
    card: 'border-[#2a302d] bg-[#161917] text-[#f4f5f2]',
    featured: 'border-[var(--org-primary)] bg-[#161917] text-[#f4f5f2] ring-4 ring-[var(--org-primary)]/25',
    logoBox: 'bg-[#0e110f]',
    badge: 'bg-org-primary text-[#0a0c0b]',
    name: 'text-[#9ca59f]',
    text: 'text-[#f4f5f2]',
    button: 'bg-org-primary text-[#0a0c0b] hover:brightness-110',
  },
} as const

function CtaButton({ sponsor, className }: { sponsor: LandingSponsor; className: string }) {
  if (!sponsor.hasCta || !sponsor.ctaLabel) return null
  return (
    <a
      href={sponsorClickHref(sponsor.id, 'cta')}
      target="_blank"
      rel="sponsored noopener"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-extrabold uppercase tracking-[0.05em] transition hover:-translate-y-0.5 ${className}`}
    >
      {sponsor.ctaLabel}
      <span aria-hidden>→</span>
    </a>
  )
}

function FeaturedCard({ sponsor, tone }: { sponsor: LandingSponsor; tone: SponsorTone }) {
  const styles = TONES[tone]
  return (
    <article
      className={`grid items-center gap-6 rounded-3xl border-2 p-6 sm:p-8 md:grid-cols-[minmax(220px,0.8fr)_1.2fr] ${styles.featured}`}
    >
      <div className={`flex min-h-[170px] items-center justify-center rounded-2xl p-6 ${styles.logoBox}`}>
        <SponsorMark
          sponsor={sponsor}
          logoClassName="h-28 sm:h-32"
          textClassName={`text-4xl font-black italic ${styles.text}`}
        />
      </div>
      <div className="space-y-3">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] ${styles.badge}`}
        >
          Auspiciador principal
        </span>
        {sponsor.logoUrl ? (
          <p className={`font-display text-[clamp(30px,4vw,46px)] font-black uppercase italic leading-[0.95] ${styles.text}`}>
            {sponsor.name}
          </p>
        ) : null}
        {sponsor.tagline ? <p className="text-lg font-semibold leading-snug sm:text-xl">{sponsor.tagline}</p> : null}
        <CtaButton sponsor={sponsor} className={`mt-1 ${styles.button}`} />
      </div>
    </article>
  )
}

function OfficialCard({ sponsor, tone }: { sponsor: LandingSponsor; tone: SponsorTone }) {
  const styles = TONES[tone]
  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border transition duration-200 hover:-translate-y-1 ${styles.card}`}
    >
      <div className={`flex h-36 items-center justify-center p-5 ${styles.logoBox}`}>
        <SponsorMark
          sponsor={sponsor}
          logoClassName="h-24 max-w-full"
          textClassName={`text-2xl font-black italic ${styles.text}`}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {sponsor.logoUrl ? (
          <p className={`font-display text-xl font-extrabold uppercase leading-tight tracking-wide ${styles.text}`}>
            {sponsor.name}
          </p>
        ) : null}
        {sponsor.tagline ? <p className="text-[15px] font-semibold leading-snug">{sponsor.tagline}</p> : null}
        <CtaButton sponsor={sponsor} className={`mt-auto w-full ${styles.button}`} />
      </div>
    </article>
  )
}

/** Sección "Nuestros auspiciadores": tarjeta destacada para el principal y tarjetas con logo grande para los oficiales. */
export function SponsorCards({ sponsors, tone }: { sponsors: LandingSponsors; tone: SponsorTone }) {
  if (sponsors.main.length === 0 && sponsors.official.length === 0) return null
  const styles = TONES[tone]

  return (
    <section id="auspiciadores" className={`scroll-mt-24 py-14 ${styles.section}`}>
      <div className={`absolute inset-0 -z-10 ${styles.glow}`} aria-hidden />
      <div className="mx-auto w-[min(1180px,calc(100%-32px))] space-y-8">
        <div>
          <p className={`border-l-4 pl-3 text-[13px] font-extrabold uppercase tracking-[0.19em] ${styles.kicker}`}>
            Gracias por hacerlo posible
          </p>
          <h2
            className={`mt-3 font-display text-[clamp(38px,6vw,64px)] font-black uppercase italic leading-[0.9] tracking-[-0.02em] ${styles.title}`}
          >
            Nuestros auspiciadores
          </h2>
          <p className={`mt-3 max-w-[560px] text-base ${styles.lead}`}>
            Empresas que apoyan el fútbol infantil y hacen posible cada partido.
          </p>
        </div>
        {sponsors.main.map((sponsor) => (
          <FeaturedCard key={sponsor.id} sponsor={sponsor} tone={tone} />
        ))}
        {sponsors.official.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
            {sponsors.official.map((sponsor) => (
              <OfficialCard key={sponsor.id} sponsor={sponsor} tone={tone} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

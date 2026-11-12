import { SponsorMark } from '@/components/marketing/sponsors/SponsorMark'
import type { SponsorTone } from '@/components/marketing/sponsors/SponsorStrip'
import { sponsorClickHref, type LandingSponsor, type LandingSponsors } from '@/lib/sponsors/landing'

const TONES = {
  kelme: {
    section: 'bg-[#f4f9ff] text-[#123a6b]',
    title: 'text-[#0B3D8F]',
    card: 'border-[#1A7AE8]/20 bg-white shadow-[0_8px_20px_rgba(26,122,232,0.06)]',
    featured: 'border-[#1A7AE8] bg-white ring-2 ring-[#1A7AE8]/20',
    muted: 'text-[#4d6790]',
    button: 'bg-[#1A7AE8] text-white hover:bg-[#0B3D8F]',
    text: 'text-[#0B3D8F]',
  },
  org: {
    section: 'bg-[#0b0d0c] text-[#f4f5f2]',
    title: 'text-[#f4f5f2]',
    card: 'border-[#2a302d] bg-[#161917]',
    featured: 'border-[var(--org-primary)] bg-[#161917]',
    muted: 'text-[#9ca59f]',
    button: 'bg-org-primary text-[#0a0c0b] hover:brightness-110',
    text: 'text-[#f4f5f2]',
  },
} as const

function Card({
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
      className={`flex flex-col gap-4 rounded-2xl border p-5 ${featured ? styles.featured : styles.card} ${
        featured ? 'sm:flex-row sm:items-center sm:justify-between sm:p-7' : ''
      }`}
    >
      <div className="flex flex-col gap-3">
        {featured ? (
          <p className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${styles.muted}`}>
            Auspiciador principal
          </p>
        ) : null}
        <SponsorMark
          sponsor={sponsor}
          logoClassName={featured ? 'h-16' : 'h-12'}
          textClassName={`${featured ? 'text-3xl' : 'text-xl'} ${styles.text}`}
        />
        {sponsor.tagline ? (
          <p className={`${featured ? 'text-lg' : 'text-[15px]'} font-semibold leading-snug`}>{sponsor.tagline}</p>
        ) : null}
      </div>
      {sponsor.hasCta && sponsor.ctaLabel ? (
        <a
          href={sponsorClickHref(sponsor.id, 'cta')}
          target="_blank"
          rel="sponsored noopener"
          className={`inline-flex w-fit items-center justify-center rounded-[4px] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.04em] transition ${styles.button}`}
        >
          {sponsor.ctaLabel}
        </a>
      ) : null}
    </article>
  )
}

/** Sección "Nuestros auspiciadores": tarjeta destacada para el principal y grilla para los oficiales. */
export function SponsorCards({ sponsors, tone }: { sponsors: LandingSponsors; tone: SponsorTone }) {
  if (sponsors.main.length === 0 && sponsors.official.length === 0) return null
  const styles = TONES[tone]

  return (
    <section id="auspiciadores" className={`scroll-mt-24 py-10 ${styles.section}`}>
      <div className="mx-auto w-[min(1180px,calc(100%-32px))] space-y-4">
        <h2 className={`font-display text-[28px] font-bold uppercase tracking-[-0.03em] ${styles.title}`}>
          Nuestros auspiciadores
        </h2>
        {sponsors.main.map((sponsor) => (
          <Card key={sponsor.id} sponsor={sponsor} tone={tone} featured />
        ))}
        {sponsors.official.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sponsors.official.map((sponsor) => (
              <Card key={sponsor.id} sponsor={sponsor} tone={tone} featured={false} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

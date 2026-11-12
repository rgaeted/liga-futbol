import { sponsorClickHref, type LandingSponsor } from '@/lib/sponsors/landing'

/** Logo (o nombre, si no hay logo) de un auspiciador, enlazado vía la ruta que cuenta los clics. */
export function SponsorMark({
  sponsor,
  to = 'web',
  logoClassName = 'h-10',
  textClassName = '',
}: {
  sponsor: LandingSponsor
  to?: 'web' | 'cta'
  logoClassName?: string
  textClassName?: string
}) {
  const content = sponsor.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sponsor.logoUrl}
      alt={sponsor.name}
      loading="lazy"
      className={`w-auto max-w-[180px] object-contain ${logoClassName}`}
    />
  ) : (
    <span className={`font-display font-bold uppercase tracking-wide ${textClassName}`}>{sponsor.name}</span>
  )

  if (!sponsor.hasWebsite && !sponsor.hasCta) return <span className="inline-flex items-center">{content}</span>
  return (
    <a
      href={sponsorClickHref(sponsor.id, to)}
      target="_blank"
      rel="sponsored noopener"
      aria-label={sponsor.name}
      className="inline-flex items-center"
    >
      {content}
    </a>
  )
}

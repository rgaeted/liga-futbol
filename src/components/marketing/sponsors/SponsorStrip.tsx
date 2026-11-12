import { SponsorMark } from '@/components/marketing/sponsors/SponsorMark'
import type { LandingSponsors } from '@/lib/sponsors/landing'

export type SponsorTone = 'kelme' | 'org'

const TONES = {
  kelme: {
    section: 'bg-white border-y border-[#dbe5f2] text-[#123a6b]',
    label: 'text-[#4d6790]',
    logo: 'opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0',
    text: 'text-[#0B3D8F]',
  },
  org: {
    section: 'bg-[#0f1311] border-y border-[#2a302d] text-[#f4f5f2]',
    label: 'text-[#9ca59f]',
    logo: 'opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0',
    text: 'text-[#f4f5f2]',
  },
} as const

/** Franja de logos: principales más grandes y primero, luego los oficiales. */
export function SponsorStrip({ sponsors, tone }: { sponsors: LandingSponsors; tone: SponsorTone }) {
  if (sponsors.main.length === 0 && sponsors.official.length === 0) return null
  const styles = TONES[tone]

  return (
    <section aria-label="Auspiciadores" className={`py-5 ${styles.section}`}>
      <div className="mx-auto flex w-[min(1180px,calc(100%-32px))] flex-wrap items-center justify-center gap-x-10 gap-y-4">
        <p className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${styles.label}`}>Auspician</p>
        {sponsors.main.map((sponsor) => (
          <span key={sponsor.id} className={styles.logo}>
            <SponsorMark sponsor={sponsor} logoClassName="h-14" textClassName={`text-2xl ${styles.text}`} />
          </span>
        ))}
        {sponsors.official.map((sponsor) => (
          <span key={sponsor.id} className={styles.logo}>
            <SponsorMark sponsor={sponsor} logoClassName="h-10" textClassName={`text-lg ${styles.text}`} />
          </span>
        ))}
      </div>
    </section>
  )
}

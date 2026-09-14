import Link from 'next/link'
import { APP_LOCALE } from '@/lib/locale'
import { personInitials } from '@/lib/player-name'
import { formatScheduleDateLabel, formatScheduleTimeLabel } from '@/lib/schedule-datetime'
import { matchStatusBadgeClass, matchStatusLabel } from '@/lib/match-status-ui'

type NextMatch = {
  id: string
  title: string
  scheduledAt: Date
  status: string
  href: string
}

type Props = {
  name: string
  photoUrl: string | null
  finishedCount: number
  totalEvents: number
  nextMatch: NextMatch | null
}

function formatPerMatch(value: number, played: number): string {
  if (played <= 0) return '0,00'
  return (value / played).toLocaleString(APP_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function RefereePanelHero({
  name,
  photoUrl,
  finishedCount,
  totalEvents,
  nextMatch,
}: Props) {
  const initials = personInitials(name)
  const [firstName, ...rest] = name.trim().split(/\s+/)
  const lastName = rest.join(' ')

  return (
    <section className="rounded-2xl border border-[#2A3A32] bg-[#121A18] p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-4 sm:gap-5">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="relative h-[88px] w-[88px] overflow-hidden rounded-2xl bg-[#1A2824] shadow-[0_8px_24px_rgba(26,40,36,0.45)] ring-2 ring-[#3DE68C]/25">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-[family-name:var(--font-anton)] text-4xl text-[#E8E4D8]">
                  {initials.slice(0, 1)}
                </span>
              )}
            </div>
            <span className="rounded-md border border-[#3DE68C]/30 bg-[#0B1210] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#3DE68C]">
              Árbitro
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-[family-name:var(--font-anton)] text-3xl uppercase tracking-wide text-[#E8E4D8]">
              {firstName}
            </h1>
            {lastName ? (
              <p className="font-[family-name:var(--font-anton)] text-xl uppercase tracking-wide text-[#8A938C]">
                {lastName}
              </p>
            ) : null}
            <p className="mt-1 text-sm text-[#8A938C]">
              {finishedCount} {finishedCount === 1 ? 'partido pitado' : 'partidos pitados'}
            </p>

            {nextMatch ? (
              <Link
                href={nextMatch.href}
                className="mt-4 block rounded-xl border border-[#3DE68C]/30 bg-[#0B1210] p-3 transition hover:border-[#3DE68C]/50"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#3DE68C]">
                  Próximo partido
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-[#E8E4D8]">
                  {nextMatch.title}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-[#8A938C]">
                    {formatScheduleDateLabel(nextMatch.scheduledAt)} ·{' '}
                    {formatScheduleTimeLabel(nextMatch.scheduledAt)}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${matchStatusBadgeClass(nextMatch.status)}`}
                  >
                    {matchStatusLabel(nextMatch.status)}
                  </span>
                </div>
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="grid grid-cols-2 gap-2 sm:gap-3 lg:max-w-[240px] lg:shrink-0">
          <HeroHighlightStat
            label="Finalizados"
            value={finishedCount}
            subtitle={finishedCount === 1 ? 'partido pitado' : 'partidos pitados'}
            accent
          />
          <HeroHighlightStat
            label="Eventos"
            value={totalEvents}
            subtitle={`${formatPerMatch(totalEvents, finishedCount)} por partido`}
          />
        </aside>
      </div>
    </section>
  )
}

function HeroHighlightStat({
  label,
  value,
  subtitle,
  accent = false,
}: {
  label: string
  value: number
  subtitle: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-xl border bg-[#0B1210] px-2.5 py-3 text-center ${
        accent ? 'border-[#3DE68C]/50' : 'border-[#2A3A32]'
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8A938C]">{label}</p>
      <p
        className={`font-[family-name:var(--font-anton)] text-2xl leading-none ${
          accent ? 'text-[#3DE68C]' : 'text-[#E8E4D8]'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-tight text-[#8A938C]">{subtitle}</p>
    </div>
  )
}

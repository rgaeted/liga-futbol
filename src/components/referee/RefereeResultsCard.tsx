import type { RefereeOrgStats } from '@/lib/referee-org-stats'
import { APP_LOCALE } from '@/lib/locale'

type Props = {
  stats: RefereeOrgStats
}

function formatPerMatch(value: number, played: number): string {
  if (played <= 0) return '0,00'
  return (value / played).toLocaleString(APP_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function RefereeResultsCard({ stats }: Props) {
  const { matches, events } = stats
  const played = matches.finished
  const cardsTotal = events.yellowCards + events.redCards

  return (
    <section className="h-full rounded-2xl border border-[#2A3A32] bg-[#121A18] p-5">
      <h2 className="font-[family-name:var(--font-anton)] text-lg uppercase tracking-[0.08em] text-[#E8E4D8]">
        Tus números
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <RateStatBlock
          label="Partidos pitados"
          value={matches.finished}
          perMatch={formatPerMatch(matches.finished, matches.finished || 1)}
          highlight
          hint={`${matches.league} liga · ${matches.friendly} amistoso`}
        />
        <RateStatBlock
          label="Goles"
          value={events.goals}
          perMatch={formatPerMatch(events.goals, played)}
          hint="En partidos finalizados"
        />
        <RateStatBlock
          label="Tarjetas"
          value={cardsTotal}
          perMatch={formatPerMatch(cardsTotal, played)}
          hint={`${events.yellowCards} amarillas · ${events.redCards} rojas`}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RateStatBlock
          label="Cambios"
          value={events.substitutions}
          perMatch={formatPerMatch(events.substitutions, played)}
        />
        <RateStatBlock
          label="Faltas"
          value={events.fouls}
          perMatch={formatPerMatch(events.fouls, played)}
        />
        <StatBlock
          label="Programados"
          value={matches.upcoming}
          hint="Por arbitrar"
        />
        <StatBlock
          label="Cancelados"
          value={matches.cancelled}
          hint={`${matches.total} asignados en total`}
        />
      </div>
    </section>
  )
}

function RateStatBlock({
  label,
  value,
  perMatch,
  hint,
  highlight = false,
}: {
  label: string
  value: number
  perMatch: string
  hint?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border bg-[#0B1210] p-4 ${
        highlight ? 'border-2 border-[#3DE68C]/50' : 'border-[#2A3A32]'
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A938C]">{label}</p>
      <p
        className={`font-[family-name:var(--font-anton)] leading-none ${
          highlight ? 'text-5xl text-[#3DE68C]' : 'text-3xl text-[#E8E4D8]'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-[#8A938C]">{perMatch} por partido</p>
      {hint ? <p className="mt-0.5 text-xs text-[#8A938C]/80">{hint}</p> : null}
    </div>
  )
}

function StatBlock({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-[#2A3A32] bg-[#0B1210] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A938C]">{label}</p>
      <p className="font-[family-name:var(--font-anton)] text-3xl leading-none text-[#E8E4D8]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[#8A938C]">{hint}</p> : null}
    </div>
  )
}

import type { PlayerMatchResults } from '@/lib/player-match-results'
import type { PlayerOrgEventStats } from '@/lib/player-org-stats'
import { APP_LOCALE } from '@/lib/locale'

type Props = {
  stats: PlayerOrgEventStats
  results: PlayerMatchResults
  mvpCount: number
  lastAssistLabel: string | null
  playedCount: number
}

function formatPerMatch(value: number, played: number): string {
  if (played <= 0) return '0,00'
  return (value / played).toLocaleString(APP_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function PlayerResultsCard({
  stats,
  results,
  mvpCount,
  lastAssistLabel,
  playedCount,
}: Props) {
  const played = results.won + results.drawn + results.lost
  const winRate = played > 0 ? Math.round((results.won / played) * 100) : 0
  const goalsPerMatch = formatPerMatch(stats.goals, played)
  const assistsPerMatch = formatPerMatch(stats.assists, played)
  const mvpsPerMatch = formatPerMatch(mvpCount, played)
  const contributionsPerMatch = formatPerMatch(stats.goals + stats.assists, played)
  const yellowsPerMatch = formatPerMatch(stats.yellowCards, played)
  const redsPerMatch = formatPerMatch(stats.redCards, played)
  const wonPct = played > 0 ? (results.won / played) * 100 : 0
  const drawnPct = played > 0 ? (results.drawn / played) * 100 : 0
  const lostPct = played > 0 ? (results.lost / played) * 100 : 0

  return (
    <section className="h-full rounded-2xl border border-[#2A3A32] bg-[#121A18] p-5">
      <h2 className="font-[family-name:var(--font-anton)] text-lg uppercase tracking-[0.08em] text-[#E8E4D8]">
        Tus números
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <RateStatBlock label="Goles" value={stats.goals} perMatch={goalsPerMatch} highlight />
        <RateStatBlock
          label="Asistencias"
          value={stats.assists}
          perMatch={assistsPerMatch}
          hint={lastAssistLabel ?? (stats.assists > 0 ? undefined : 'Aún sin asistencias')}
        />
        <RateStatBlock
          label="MVPs"
          value={mvpCount}
          perMatch={mvpsPerMatch}
          hint={mvpCount > 0 ? undefined : 'Aún sin premio MVP'}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RateStatBlock
          label="G + A"
          value={stats.goals + stats.assists}
          perMatch={contributionsPerMatch}
          hint="Goles más asistencias"
        />
        <RateStatBlock label="Amarillas" value={stats.yellowCards} perMatch={yellowsPerMatch} />
        <RateStatBlock label="Rojas" value={stats.redCards} perMatch={redsPerMatch} />
        <StatBlock label="Partidos" value={playedCount} hint={`${results.won}G · ${results.drawn}E · ${results.lost}P`} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A938C]">
            Rendimiento
          </p>
          <p className="text-sm font-semibold text-[#E8E4D8]">
            {winRate}% <span className="font-normal text-[#8A938C]">de victorias</span>
          </p>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-[#0B1210]">
          {wonPct > 0 ? (
            <div className="bg-[#3DE68C]" style={{ width: `${wonPct}%` }} title={`Ganados ${results.won}`} />
          ) : null}
          {drawnPct > 0 ? (
            <div className="bg-[#8A938C]" style={{ width: `${drawnPct}%` }} title={`Empatados ${results.drawn}`} />
          ) : null}
          {lostPct > 0 ? (
            <div className="bg-[#E06055]" style={{ width: `${lostPct}%` }} title={`Perdidos ${results.lost}`} />
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A938C]">
          <span className="text-[#3DE68C]">Ganados {results.won}</span>
          <span>Empatados {results.drawn}</span>
          <span className="text-[#E06055]">Perdidos {results.lost}</span>
        </div>
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
        highlight ? 'border-2 border-[#C91F26]/50' : 'border-[#2A3A32]'
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A938C]">{label}</p>
      <p
        className={`font-[family-name:var(--font-anton)] leading-none ${
          highlight ? 'text-5xl text-[#C91F26]' : 'text-3xl text-[#E8E4D8]'
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
      <p className="font-[family-name:var(--font-anton)] text-3xl leading-none text-[#E8E4D8]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#8A938C]">{hint}</p> : null}
    </div>
  )
}

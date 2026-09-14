import type { PlayerCardDto } from '@/lib/player-card-query'
import type { PlayerMatchResults } from '@/lib/player-match-results'
import type { PlayerOrgEventStats } from '@/lib/player-org-stats'
import { APP_LOCALE } from '@/lib/locale'

type Props = {
  stats: PlayerOrgEventStats
  results: PlayerMatchResults
  mvpCount: number
  lastAssistLabel: string | null
  playedCount: number
  card?: PlayerCardDto | null
}

export function PlayerResultsCard({
  stats,
  results,
  mvpCount,
  lastAssistLabel,
  playedCount,
  card,
}: Props) {
  const played = results.won + results.drawn + results.lost
  const winRate = played > 0 ? Math.round((results.won / played) * 100) : 0
  const goalsPerMatch =
    played > 0
      ? (stats.goals / played).toLocaleString(APP_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0,00'
  const wonPct = played > 0 ? (results.won / played) * 100 : 0
  const drawnPct = played > 0 ? (results.drawn / played) * 100 : 0
  const lostPct = played > 0 ? (results.lost / played) * 100 : 0
  const goalContributions = stats.goals + stats.assists

  return (
    <section className="h-full rounded-2xl border border-[#2A3A32] bg-[#121A18] p-5">
      <h2 className="font-[family-name:var(--font-anton)] text-lg uppercase tracking-[0.08em] text-[#E8E4D8]">
        Tus números
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border-2 border-[#C91F26]/50 bg-[#0B1210] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A938C]">Goles</p>
          <p className="font-[family-name:var(--font-anton)] text-5xl leading-none text-[#C91F26]">
            {stats.goals}
          </p>
          <p className="mt-1 text-xs text-[#8A938C]">{goalsPerMatch} por partido</p>
        </div>

        <StatBlock
          label="Asistencias"
          value={stats.assists}
          hint={lastAssistLabel ?? (stats.assists > 0 ? undefined : 'Aún sin asistencias')}
        />
        <StatBlock
          label="MVPs"
          value={mvpCount}
          hint={mvpCount > 0 ? undefined : 'Aún sin premio MVP'}
        />
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

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Partidos" value={playedCount} />
        <MiniStat label="G + A" value={goalContributions} hint="Goles más asistencias" />
        {card ? (
          <>
            <MiniStat label="Presencias" value={card.crudos.presencias} hint="Ventana carta" />
            <MiniStat
              label="OVR"
              value={card.ovr ?? '—'}
              hint={card.estado === 'en_formacion' ? 'Carta en formación' : 'Rating carta'}
            />
            <MiniStat label="Racha goles" value={card.crudos.rachaGoleadora} />
            <MiniStat label="Racha presencia" value={card.crudos.rachaPresencia} />
            <MiniStat label="MVPs carta" value={card.crudos.mvps} hint="Ventana carta" />
            <MiniStat
              label="PJ ventana"
              value={`${card.ventana.pj}/${card.ventana.minPj}`}
              hint={`Últimos ${card.ventana.dias} días`}
            />
          </>
        ) : (
          <>
            <MiniStat label="Ganados" value={results.won} accent="win" />
            <MiniStat label="Empatados" value={results.drawn} />
            <MiniStat label="Perdidos" value={results.lost} accent="loss" />
          </>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <DisciplinePill label="Amarillas" value={stats.yellowCards} />
        <DisciplinePill label="Rojas" value={stats.redCards} />
      </div>
    </section>
  )
}

function MiniStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: number | string
  hint?: string
  accent?: 'win' | 'loss'
}) {
  const valueColor =
    accent === 'win' ? 'text-[#3DE68C]' : accent === 'loss' ? 'text-[#E06055]' : 'text-[#E8E4D8]'

  return (
    <div className="rounded-lg border border-[#2A3A32] bg-[#0B1210] px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8A938C]">{label}</p>
      <p className={`font-[family-name:var(--font-anton)] text-2xl leading-none ${valueColor}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[10px] text-[#8A938C]/80">{hint}</p> : null}
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

function DisciplinePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-lg border border-[#2A3A32] bg-[#0B1210] px-3 py-2 text-center">
      <p className="font-[family-name:var(--font-anton)] text-xl text-[#E8E4D8]">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8A938C]">{label}</p>
    </div>
  )
}

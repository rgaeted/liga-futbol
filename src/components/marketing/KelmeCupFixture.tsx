'use client'

import { useMemo, useState, type ReactNode } from 'react'
import type {
  FixtureView,
  FixtureViewMatch,
  FixtureViewTable,
} from '@/lib/kelme-fixture/view'
import type { CategoryCode, FixtureStatus } from '@/lib/kelme-fixture/types'

const STATUS_LABELS: Record<FixtureStatus, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En juego',
  FINAL: 'Finalizado',
  CANCELLED: 'Anulado',
}

const STATUS_STYLES: Record<FixtureStatus, string> = {
  SCHEDULED: 'bg-[#e6f1fe] text-[#0B3D8F]',
  IN_PROGRESS: 'bg-[#ffe9e5] text-[#c2321b]',
  FINAL: 'bg-[#0B3D8F] text-white',
  CANCELLED: 'bg-[#eceff4] text-[#4d6790]',
}

const CROSS_LABELS: Record<number, string> = { 1: 'Final', 2: '3.er puesto', 3: '5.º puesto' }

const ALL = 'ALL'

function categoryLabel(code: CategoryCode) {
  return code.replace('-', '–')
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-[13px] font-bold transition ${
        active
          ? 'border-[#1A7AE8] bg-[#1A7AE8] text-white'
          : 'border-[#1A7AE8]/25 bg-white text-[#0B3D8F] hover:border-[#1A7AE8]'
      }`}
    >
      {children}
    </button>
  )
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#4d6790]">
        {label}
      </span>
      {children}
    </div>
  )
}

function MatchCard({ match }: { match: FixtureViewMatch }) {
  const showScore = match.status === 'FINAL' || match.status === 'IN_PROGRESS'
  const decisive = match.phase === 'FINAL'
  const hasPenalties = match.penaltyHome != null && match.penaltyAway != null
  const homeWon = match.status === 'FINAL' && match.homeGoals > match.awayGoals
  const awayWon = match.status === 'FINAL' && match.awayGoals > match.homeGoals

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-[0_8px_20px_rgba(26,122,232,0.06)] ${
        decisive ? 'border-[#1A7AE8] ring-2 ring-[#1A7AE8]/20' : 'border-[#1A7AE8]/20'
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#4d6790]">
        <span>
          {match.timeLabel} · Cancha {match.court}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] ${STATUS_STYLES[match.status]}`}>
          {STATUS_LABELS[match.status]}
        </span>
      </header>
      <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#1A7AE8]">
        {categoryLabel(match.category)} · {match.phaseLabel}
      </p>

      <div className="mt-3 space-y-1.5 text-[15px] font-semibold text-[#123a6b]">
        <div className="flex items-center justify-between gap-3">
          <span className={match.home.pending ? 'italic text-[#4d6790]' : homeWon ? 'font-extrabold' : ''}>
            {match.home.name}
          </span>
          <strong className="font-display text-xl text-[#0B3D8F]">{showScore ? match.homeGoals : '–'}</strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={match.away.pending ? 'italic text-[#4d6790]' : awayWon ? 'font-extrabold' : ''}>
            {match.away.name}
          </span>
          <strong className="font-display text-xl text-[#0B3D8F]">{showScore ? match.awayGoals : '–'}</strong>
        </div>
      </div>
      {hasPenalties ? (
        <p className="mt-2 text-xs font-semibold text-[#4d6790]">
          Penales {match.penaltyHome}–{match.penaltyAway}
        </p>
      ) : null}
    </article>
  )
}

function StandingsCard({ table }: { table: FixtureViewTable }) {
  const showCross = table.key !== 'LEAGUE' && table.definitive
  return (
    <div className="rounded-2xl border border-[#1A7AE8]/20 bg-white p-4 shadow-[0_8px_20px_rgba(26,122,232,0.06)]">
      <h3 className="font-display text-lg font-bold uppercase tracking-[0.04em] text-[#0B3D8F]">
        {table.title}
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[300px] text-[13px] text-[#123a6b]">
          <thead>
            <tr className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#4d6790]">
              <th className="py-1 text-left">#</th>
              <th className="py-1 text-left">Equipo</th>
              <th className="py-1">PJ</th>
              <th className="py-1">PG</th>
              <th className="py-1">PE</th>
              <th className="py-1">PP</th>
              <th className="py-1">GF</th>
              <th className="py-1">GC</th>
              <th className="py-1">DG</th>
              <th className="py-1">PTS</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.teamId} className="border-t border-[#1A7AE8]/10 text-center">
                <td className="py-2 text-left font-bold">{row.tied ? `${row.rank}*` : row.rank}</td>
                <td className="py-2 text-left font-semibold">
                  {row.name}
                  {showCross && CROSS_LABELS[row.rank] ? (
                    <span className="ml-2 rounded-full bg-[#e6f1fe] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#0B3D8F]">
                      {row.rank === 1 ? 'Clasificado · ' : ''}
                      {CROSS_LABELS[row.rank]}
                    </span>
                  ) : null}
                </td>
                <td>{row.pj}</td>
                <td>{row.pg}</td>
                <td>{row.pe}</td>
                <td>{row.pp}</td>
                <td>{row.gf}</td>
                <td>{row.gc}</td>
                <td>{row.dg > 0 ? `+${row.dg}` : row.dg}</td>
                <td className="font-display text-base font-bold text-[#0B3D8F]">{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.pendingTie ? (
        <p className="mt-2 text-xs font-bold text-[#c2321b]">
          Pendiente de desempate. La organización definirá el orden.
        </p>
      ) : null}
    </div>
  )
}

export function KelmeCupFixture({ view }: { view: FixtureView }) {
  const [category, setCategory] = useState<string>(ALL)
  const [group, setGroup] = useState<string>(ALL)
  const [time, setTime] = useState<string>(ALL)
  const [court, setCourt] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)

  const times = useMemo(
    () => [...new Map(view.matches.map((m) => [m.startAt, m.timeLabel.split('–')[0]])).entries()],
    [view.matches],
  )
  const courts = useMemo(
    () => [...new Set(view.matches.map((m) => m.court))].sort((a, b) => a - b),
    [view.matches],
  )

  const filtered = view.matches.filter(
    (m) =>
      (category === ALL || m.category === category) &&
      (group === ALL ||
        (group === 'DEF' ? m.phase !== 'GROUP' && m.phase !== 'LEAGUE' : m.group === group)) &&
      (time === ALL || m.startAt === time) &&
      (court === ALL || String(m.court) === court) &&
      (status === ALL || m.status === status),
  )

  const final = view.matches.find((m) => m.phase === 'FINAL')

  return (
    <section id="fixture" className="scroll-mt-24 bg-[#f4f9ff] py-8 text-[#123a6b]">
      <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
        <p className="font-script text-2xl text-[#1A7AE8]">Domingo 15 de noviembre</p>
        <h2 className="mt-1 font-display text-[28px] font-bold uppercase tracking-[-0.03em] text-[#0B3D8F]">
          Fixture y resultados
        </h2>

        <div className="mt-5 space-y-2.5 rounded-2xl border border-[#1A7AE8]/20 bg-white p-4">
          <FilterRow label="Categoría">
            <Chip active={category === ALL} onClick={() => setCategory(ALL)}>
              Todas
            </Chip>
            <Chip active={category === '2017-2016'} onClick={() => setCategory('2017-2016')}>
              2017–2016
            </Chip>
            <Chip active={category === '2019-2018'} onClick={() => setCategory('2019-2018')}>
              2019–2018
            </Chip>
          </FilterRow>
          <FilterRow label="Fase">
            <Chip active={group === ALL} onClick={() => setGroup(ALL)}>
              Todas
            </Chip>
            <Chip active={group === 'A'} onClick={() => setGroup('A')}>
              Grupo A
            </Chip>
            <Chip active={group === 'B'} onClick={() => setGroup('B')}>
              Grupo B
            </Chip>
            <Chip active={group === 'DEF'} onClick={() => setGroup('DEF')}>
              Definiciones
            </Chip>
          </FilterRow>
          <FilterRow label="Horario">
            <Chip active={time === ALL} onClick={() => setTime(ALL)}>
              Todos
            </Chip>
            {times.map(([value, label]) => (
              <Chip key={value} active={time === value} onClick={() => setTime(value)}>
                {label}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Cancha">
            <Chip active={court === ALL} onClick={() => setCourt(ALL)}>
              Todas
            </Chip>
            {courts.map((value) => (
              <Chip key={value} active={court === String(value)} onClick={() => setCourt(String(value))}>
                {value}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Estado">
            <Chip active={status === ALL} onClick={() => setStatus(ALL)}>
              Todos
            </Chip>
            {(['SCHEDULED', 'IN_PROGRESS', 'FINAL'] as FixtureStatus[]).map((value) => (
              <Chip key={value} active={status === value} onClick={() => setStatus(value)}>
                {STATUS_LABELS[value]}
              </Chip>
            ))}
          </FilterRow>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-[#1A7AE8]/30 bg-white p-6 text-center text-sm font-semibold text-[#4d6790]">
            No hay partidos con estos filtros.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}

        {final && final.home.pending ? (
          <p className="mt-3 text-xs font-semibold text-[#4d6790]">
            Los cruces de definición (final, tercer y quinto puesto) se arman automáticamente cuando
            terminan los dos grupos.
          </p>
        ) : null}

        <h3 className="mt-10 font-display text-[22px] font-bold uppercase tracking-[-0.02em] text-[#0B3D8F]">
          Tablas de posiciones
        </h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {view.tables.map((table) => (
            <StandingsCard key={table.key} table={table} />
          ))}
        </div>

        {view.positions.length > 0 ? (
          <div className="mt-8 rounded-2xl border border-[#1A7AE8]/20 bg-white p-4">
            <h3 className="font-display text-lg font-bold uppercase text-[#0B3D8F]">
              Posiciones finales · 2017–2016
            </h3>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {view.positions.map((p) => (
                <li
                  key={`${p.position}-${p.teamId}`}
                  className="rounded-xl bg-[#eef6ff] px-3 py-2 text-sm font-semibold"
                >
                  <strong className="font-display text-lg text-[#1A7AE8]">{p.position}.º</strong> {p.name}
                  {p.tied ? <span className="ml-2 text-xs text-[#4d6790]">(empate)</span> : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  )
}

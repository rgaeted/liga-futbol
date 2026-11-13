'use client'

import { useMemo, useState, type ReactNode } from 'react'
import type {
  FixtureView,
  FixtureViewMatch,
  FixtureViewTable,
} from '@/lib/kelme-fixture/view'
import type { CategoryCode, FixtureStatus } from '@/lib/kelme-fixture/types'
import { SponsorMark } from '@/components/marketing/sponsors/SponsorMark'
import { courtTarget, phaseTarget, type LandingSponsor } from '@/lib/sponsors/landing'

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

/** Cada categoría tiene su propio color para reconocerla de un vistazo. */
const CATEGORY_THEME: Record<CategoryCode, { bar: string; badge: string; dot: string }> = {
  '2017-2016': { bar: 'bg-[#1A7AE8]', badge: 'bg-[#e6f1fe] text-[#0B3D8F]', dot: 'bg-[#1A7AE8]' },
  '2019-2018': { bar: 'bg-[#f08a24]', badge: 'bg-[#fff0dd] text-[#9a4a05]', dot: 'bg-[#f08a24]' },
}

/** Cada cancha tiene un color fijo para ubicarla de inmediato. */
const COURT_COLORS: Record<number, string> = {
  1: '#16a37f',
  2: '#7a5af8',
  3: '#d9485f',
  4: '#0e8fb3',
}

const courtColor = (court: number) => COURT_COLORS[court] ?? '#4d6790'

function CourtPill({ court, sponsor }: { court: number; sponsor?: LandingSponsor }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.08em] text-white"
      style={{ backgroundColor: courtColor(court) }}
    >
      Cancha {court}
      {sponsor ? ` · ${sponsor.name}` : null}
      {sponsor?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sponsor.logoUrl} alt="" className="h-4 w-auto rounded-sm bg-white/90 object-contain px-0.5" />
      ) : null}
    </span>
  )
}

const PRESENTED_BY: Partial<Record<FixtureViewMatch['phase'], string>> = {
  FINAL: 'Final presentada por',
  THIRD_PLACE: '3.er puesto presentado por',
  FIFTH_PLACE: '5.º puesto presentado por',
}

/** Cada equipo conserva el mismo color en todas las tarjetas. */
const TEAM_COLORS = ['#1A7AE8', '#16a37f', '#d9485f', '#7a5af8', '#e08a00', '#0e9ab3', '#c2410c', '#4d6790']

function teamColor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TEAM_COLORS[hash % TEAM_COLORS.length]
}

/** Usa el color configurado del equipo; si no tiene, uno estable según su nombre. */
function resolveTeamColor(name: string, color?: string | null) {
  return color && /^#[0-9a-f]{6}$/i.test(color.trim()) ? color.trim() : teamColor(name)
}

/** Escudo del equipo; si no tiene, solo un círculo con su color. */
function TeamBadge({
  name,
  pending,
  color,
  crestUrl,
}: {
  name: string
  pending: boolean
  color?: string | null
  crestUrl?: string | null
}) {
  if (pending) {
    return (
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-[#4d6790]/50 text-[11px] font-extrabold text-[#4d6790]"
      >
        ?
      </span>
    )
  }
  if (crestUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={crestUrl}
        alt=""
        loading="lazy"
        className="h-7 w-7 shrink-0 rounded-full bg-white object-contain ring-1 ring-black/10"
      />
    )
  }
  return (
    <span
      aria-hidden
      className="h-7 w-7 shrink-0 rounded-full ring-1 ring-black/10"
      style={{ backgroundColor: resolveTeamColor(name, color) }}
    />
  )
}

function TeamRow({
  side,
  goals,
  showScore,
  won,
}: {
  side: { name: string; pending: boolean; color: string | null; crestUrl: string | null }
  goals: number
  showScore: boolean
  won: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2.5">
        <TeamBadge name={side.name} pending={side.pending} color={side.color} crestUrl={side.crestUrl} />
        <span
          className={`truncate ${side.pending ? 'italic text-[#4d6790]' : won ? 'font-extrabold text-[#0a1f44]' : ''}`}
        >
          {side.name}
        </span>
      </span>
      <strong
        className={`font-display text-xl ${won ? 'rounded-md bg-[#0B3D8F] px-2 text-white' : 'text-[#0B3D8F]'}`}
      >
        {showScore ? goals : '–'}
      </strong>
    </div>
  )
}

function MatchCard({
  match,
  courtSponsor,
  phaseSponsor,
  liveHref,
}: {
  match: FixtureViewMatch
  courtSponsor?: LandingSponsor
  phaseSponsor?: LandingSponsor
  liveHref?: string
}) {
  const showScore = match.status === 'FINAL' || match.status === 'IN_PROGRESS'
  const decisive = match.phase === 'FINAL'
  const hasPenalties = match.penaltyHome != null && match.penaltyAway != null
  const homeWon = match.status === 'FINAL' && match.homeGoals > match.awayGoals
  const awayWon = match.status === 'FINAL' && match.awayGoals > match.homeGoals
  const theme = CATEGORY_THEME[match.category]

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white p-4 pl-5 shadow-[0_8px_20px_rgba(26,122,232,0.06)] ${
        decisive ? 'border-[#1A7AE8] ring-2 ring-[#1A7AE8]/20' : 'border-[#1A7AE8]/20'
      } ${liveHref ? 'transition hover:-translate-y-0.5 hover:border-[#1A7AE8] hover:shadow-[0_12px_26px_rgba(26,122,232,0.18)]' : ''}`}
    >
      {liveHref ? (
        // Enlace que cubre toda la tarjeta; los enlaces internos (auspiciador) quedan por encima.
        <a
          href={liveHref}
          aria-label={`Ver en vivo: ${match.home.name} vs ${match.away.name}`}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A7AE8]"
        />
      ) : null}
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${theme.bar}`} />
      <header className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#4d6790]">
        <span className="flex items-center gap-2">
          {match.timeLabel}
          <CourtPill court={match.court} sponsor={courtSponsor} />
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] ${STATUS_STYLES[match.status]}`}>
          {STATUS_LABELS[match.status]}
        </span>
      </header>
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em]">
        <span className={`rounded-full px-2.5 py-0.5 ${theme.badge}`}>{categoryLabel(match.category)}</span>
        <span className="rounded-full bg-[#eef1f6] px-2.5 py-0.5 text-[#4d6790]">{match.phaseLabel}</span>
      </p>

      {phaseSponsor && PRESENTED_BY[match.phase] ? (
        <p className="relative z-20 mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#4d6790]">
          {PRESENTED_BY[match.phase]}
          <SponsorMark sponsor={phaseSponsor} logoClassName="h-6" textClassName="text-sm text-[#0B3D8F]" />
        </p>
      ) : null}

      <div className="mt-3 space-y-2 text-[15px] font-semibold text-[#123a6b]">
        <TeamRow side={match.home} goals={match.homeGoals} showScore={showScore} won={homeWon} />
        <TeamRow side={match.away} goals={match.awayGoals} showScore={showScore} won={awayWon} />
      </div>
      {hasPenalties ? (
        <p className="mt-2 text-xs font-semibold text-[#4d6790]">
          Penales {match.penaltyHome}–{match.penaltyAway}
        </p>
      ) : null}
      {liveHref ? (
        <p aria-hidden className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1A7AE8]">
          {match.status === 'IN_PROGRESS' ? 'Ver en vivo' : 'Ver partido'} →
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
                  <span className="inline-flex items-center gap-2">
                    <TeamBadge name={row.name} pending={false} color={row.color} crestUrl={row.crestUrl} />
                    {row.name}
                  </span>
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

export function KelmeCupFixture({
  view,
  sponsorsByTarget = {},
  exportHref,
  liveHrefBase,
}: {
  view: FixtureView
  /** Base de la página en vivo (p. ej. "/kelme/live"); cada partido enlaza a `${base}/${id}`. */
  liveHrefBase?: string
  /** Descarga del fixture en Excel; si falta, no se muestra el botón. */
  exportHref?: string
  /** Auspiciador que presenta cada cancha o definición ("court:1", "phase:FINAL"). */
  sponsorsByTarget?: Record<string, LandingSponsor>
}) {
  const [category, setCategory] = useState<string>(ALL)
  const [group, setGroup] = useState<string>(ALL)
  const [time, setTime] = useState<string>(ALL)
  const [court, setCourt] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [club, setClub] = useState<string>(ALL)

  const times = useMemo(
    () => [...new Map(view.matches.map((m) => [m.startAt, m.timeLabel.split('–')[0]])).entries()],
    [view.matches],
  )
  const clubs = useMemo(
    () =>
      [
        ...new Set(
          view.matches.flatMap((m) => [m.home, m.away]).filter((side) => !side.pending).map((side) => side.name),
        ),
      ].sort((a, b) => a.localeCompare(b, 'es-CL')),
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
      (status === ALL || m.status === status) &&
      (club === ALL || m.home.name === club || m.away.name === club),
  )

  const final = view.matches.find((m) => m.phase === 'FINAL')

  return (
    <section id="fixture" className="scroll-mt-24 bg-[#f4f9ff] py-8 text-[#123a6b]">
      <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
        <p className="border-l-4 border-[#4b9deb] pl-3 text-[13px] font-extrabold uppercase tracking-[0.19em] text-[#1A7AE8]">Domingo 15 de noviembre</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[28px] font-bold uppercase tracking-[-0.03em] text-[#0B3D8F]">
            Fixture y resultados
          </h2>
          {exportHref ? (
            <a
              href={exportHref}
              download
              className="inline-flex items-center gap-2 rounded-lg border border-[#1A7AE8]/40 bg-white px-4 py-2 text-[13px] font-extrabold uppercase tracking-[0.06em] text-[#0B3D8F] transition hover:border-[#1A7AE8] hover:bg-[#e6f1fe]"
            >
              <span aria-hidden>↓</span>
              Exportar a Excel
            </a>
          ) : null}
        </div>

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
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-white/70"
                    style={{ backgroundColor: courtColor(value) }}
                  />
                  {value}
                </span>
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Club">
            <select
              aria-label="Filtrar por club"
              value={club}
              onChange={(event) => setClub(event.target.value)}
              className="rounded-full border border-[#1A7AE8]/25 bg-white px-3 py-1.5 text-[13px] font-bold text-[#0B3D8F]"
            >
              <option value={ALL}>Todos los clubes</option>
              {clubs.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
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

        <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] font-bold text-[#4d6790]">
          {(Object.keys(CATEGORY_THEME) as CategoryCode[]).map((code) => (
            <li key={code} className="flex items-center gap-2">
              <span aria-hidden className={`h-3 w-3 rounded-full ${CATEGORY_THEME[code].dot}`} />
              Categoría {categoryLabel(code)}
            </li>
          ))}
          {courts.map((value) => (
            <li key={`court-${value}`} className="flex items-center gap-2">
              <span aria-hidden className="h-3 w-3 rounded" style={{ backgroundColor: courtColor(value) }} />
              Cancha {value}
            </li>
          ))}
        </ul>

        {filtered.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-[#1A7AE8]/30 bg-white p-6 text-center text-sm font-semibold text-[#4d6790]">
            No hay partidos con estos filtros.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                liveHref={liveHrefBase ? `${liveHrefBase}/${match.id}` : undefined}
                courtSponsor={sponsorsByTarget[courtTarget(match.court)]}
                phaseSponsor={
                  match.phase === 'FINAL' || match.phase === 'THIRD_PLACE' || match.phase === 'FIFTH_PLACE'
                    ? sponsorsByTarget[phaseTarget(match.phase)]
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {final && final.home.pending ? (
          <p className="mt-3 text-xs font-semibold text-[#4d6790]">
            Los cruces de definición (final, tercer y quinto puesto) se arman automáticamente cuando
            terminan los dos grupos.
          </p>
        ) : null}

        <h3 id="posiciones" className="mt-10 scroll-mt-24 font-display text-[22px] font-bold uppercase tracking-[-0.02em] text-[#0B3D8F]">
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

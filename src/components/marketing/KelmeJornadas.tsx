'use client'

import { useMemo, useState } from 'react'
import type { PublicJornada, JornadaView } from '@/lib/kelme-fixture/jornada'
import type { FixtureStatus } from '@/lib/kelme-fixture/types'
import type { LandingSponsor } from '@/lib/sponsors/landing'
import { courtTarget } from '@/lib/sponsors/landing'
import {
  Chip,
  FilterRow,
  KelmeCupFixture,
  MatchCard,
  StandingsCard,
  categoryTheme,
  courtColor,
} from '@/components/marketing/KelmeCupFixture'

const ALL = 'ALL'

const STATUS_LABELS: Record<Exclude<FixtureStatus, 'CANCELLED'>, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En juego',
  FINAL: 'Finalizado',
}

const categoryLabel = (name: string) => name.replace('-', '–')

/** Fecha todos contra todos: partidos filtrables y una tabla de posiciones por categoría. */
function JornadaFixture({
  view,
  dateLabel,
  liveHrefBase,
  exportHref,
  sponsorsByTarget,
}: {
  view: JornadaView
  dateLabel: string
  liveHrefBase?: string
  /** Descarga de esta fecha en Excel; si falta, no se muestra el botón. */
  exportHref?: string
  sponsorsByTarget: Record<string, LandingSponsor>
}) {
  const [category, setCategory] = useState<string>(ALL)
  const [court, setCourt] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)

  const categories = useMemo(() => view.tables.map((table) => table.category), [view.tables])
  const courts = useMemo(
    () => [...new Set(view.matches.map((m) => m.court))].sort((a, b) => a - b),
    [view.matches],
  )
  const filtered = view.matches.filter(
    (m) =>
      (category === ALL || m.category === category) &&
      (court === ALL || String(m.court) === court) &&
      (status === ALL || m.status === status),
  )

  return (
    <section id="fixture" className="scroll-mt-24 bg-[#f4f9ff] pb-8 pt-4 text-[#123a6b]">
      <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
        <p className="border-l-4 border-[#4b9deb] pl-3 text-[13px] font-extrabold uppercase tracking-[0.19em] text-[#1A7AE8]">
          {dateLabel}
        </p>
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
            {categories.map((name) => (
              <Chip key={name} active={category === name} onClick={() => setCategory(name)}>
                {categoryLabel(name)}
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
          <FilterRow label="Estado">
            <Chip active={status === ALL} onClick={() => setStatus(ALL)}>
              Todos
            </Chip>
            {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((value) => (
              <Chip key={value} active={status === value} onClick={() => setStatus(value)}>
                {STATUS_LABELS[value]}
              </Chip>
            ))}
          </FilterRow>
        </div>

        <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] font-bold text-[#4d6790]">
          {categories.map((name) => (
            <li key={name} className="flex items-center gap-2">
              <span aria-hidden className={`h-3 w-3 rounded-full ${categoryTheme(name).dot}`} />
              Categoría {categoryLabel(name)}
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
              />
            ))}
          </div>
        )}

        <h3
          id="posiciones"
          className="mt-10 scroll-mt-24 font-display text-[22px] font-bold uppercase tracking-[-0.02em] text-[#0B3D8F]"
        >
          Tablas de posiciones
        </h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {view.tables.map((table) => (
            <StandingsCard key={table.category} table={table} />
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Fixture de la landing con selector de fecha: la más reciente (próxima fecha) se muestra por
 * defecto y las anteriores quedan a un clic.
 */
export function KelmeJornadas({
  jornadas,
  sponsorsBySeason = {},
  exportHref,
  liveHrefBase,
}: {
  jornadas: PublicJornada[]
  sponsorsBySeason?: Record<string, Record<string, LandingSponsor>>
  exportHref?: string
  liveHrefBase?: string
}) {
  const [selectedId, setSelectedId] = useState(jornadas[0]?.seasonId)
  const selected = jornadas.find((j) => j.seasonId === selectedId) ?? jornadas[0]
  if (!selected) return null

  const sponsorsByTarget = sponsorsBySeason[selected.seasonId] ?? {}
  const selectedExportHref = exportHref ? `${exportHref}?season=${selected.seasonId}` : undefined

  return (
    <>
      {jornadas.length > 1 ? (
        <div className="bg-[#f4f9ff] pt-8">
          <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
            <div role="tablist" aria-label="Fecha del torneo" className="flex flex-wrap gap-2">
              {jornadas.map((jornada, index) => {
                const active = jornada.seasonId === selected.seasonId
                return (
                  <button
                    key={jornada.seasonId}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedId(jornada.seasonId)}
                    className={`rounded-xl border px-4 py-2.5 text-left transition ${
                      active
                        ? 'border-[#1A7AE8] bg-[#1A7AE8] text-white'
                        : 'border-[#1A7AE8]/25 bg-white text-[#0B3D8F] hover:border-[#1A7AE8]'
                    }`}
                  >
                    <span className="block text-[14px] font-extrabold">{jornada.dateLabel}</span>
                    <span
                      className={`block text-[11px] font-bold uppercase tracking-[0.1em] ${active ? 'text-white/80' : 'text-[#4d6790]'}`}
                    >
                      {index === 0 ? 'Próxima fecha' : 'Fecha anterior · resultados'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {selected.kind === 'legacy' ? (
        <KelmeCupFixture
          key={selected.seasonId}
          view={selected.view}
          dateLabel={selected.dateLabel}
          sponsorsByTarget={sponsorsByTarget}
          exportHref={selectedExportHref}
          liveHrefBase={liveHrefBase}
        />
      ) : (
        <JornadaFixture
          key={selected.seasonId}
          view={selected.view}
          dateLabel={selected.dateLabel}
          sponsorsByTarget={sponsorsByTarget}
          liveHrefBase={liveHrefBase}
          exportHref={selectedExportHref}
        />
      )}
    </>
  )
}

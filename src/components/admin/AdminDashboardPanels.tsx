'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useOrgPath } from '@/hooks/useOrgPath'
import type {
  AdminDashboardMatchRow,
  AdminDashboardScorerRow,
  CategoryStandingBlock,
  AdminDashboardTile,
  AdminDashboardTodo,
} from '@/lib/admin-dashboard'
import { contrastTextColor } from '@/lib/team-color'

function MatchRows({
  rows,
  orgPath,
}: {
  rows: AdminDashboardMatchRow[]
  orgPath: (path: string) => string
}) {
  if (rows.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-[#8A938C]">
        No hay partidos para mostrar en esta vista.
      </div>
    )
  }

  return (
    <>
      {rows.map((m) => (
        <Link
          key={m.id}
          href={orgPath(`/live/${m.id}`)}
          className="grid grid-cols-[62px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#2A3A32] px-5 py-3.5 transition-colors hover:bg-[#0B1210] max-lg:grid-cols-1 max-lg:gap-2"
        >
          <div className="leading-tight">
            <div className="text-[13px] font-bold capitalize text-[#E8E4D8]">{m.day}</div>
            <div className="text-xs text-[#8A938C]">{m.time}</div>
          </div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_58px_minmax(0,1fr)] items-center gap-2 max-sm:grid-cols-1 max-sm:gap-3">
            <div className="flex min-w-0 items-center justify-end gap-2 max-sm:justify-start">
              <span className="min-w-0 text-right text-sm font-semibold leading-snug text-[#E8E4D8] max-sm:text-left">
                {m.home}
              </span>
              <span
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-[11px] font-bold"
                style={{ background: m.homeColor, color: contrastTextColor(m.homeColor) }}
              >
                {m.homeAbbr}
              </span>
            </div>
            <div className="font-data text-center text-[21px] font-bold tracking-wide text-[#E8E4D8] max-sm:order-first">
              {m.score}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-[11px] font-bold"
                style={{ background: m.awayColor, color: contrastTextColor(m.awayColor) }}
              >
                {m.awayAbbr}
              </span>
              <span className="min-w-0 text-sm font-semibold leading-snug text-[#E8E4D8]">{m.away}</span>
            </div>
          </div>
          <div className="flex w-[108px] shrink-0 flex-col items-end gap-1 max-lg:w-full max-lg:items-start">
            <span
              className="max-w-full rounded-full px-2.5 py-0.5 text-right text-[11px] font-bold leading-snug max-lg:text-left"
              style={{ background: m.stateBg, color: m.stateFg }}
            >
              {m.state}
            </span>
            <span className="max-w-full text-right text-[11px] leading-snug text-[#8A938C] max-lg:text-left">
              {m.venue}
            </span>
          </div>
        </Link>
      ))}
    </>
  )
}

type Props = {
  upcoming: AdminDashboardMatchRow[]
  results: AdminDashboardMatchRow[]
  standings: CategoryStandingBlock[]
  scorers: AdminDashboardScorerRow[]
  tiles: AdminDashboardTile[]
  todos: AdminDashboardTodo[]
}

export function AdminDashboardPanels({
  upcoming,
  results,
  standings,
  scorers,
  tiles,
  todos,
}: Props) {
  const orgPath = useOrgPath()
  const [tab, setTab] = useState<'proximos' | 'resultados'>('proximos')
  const matches = tab === 'proximos' ? upcoming : results

  const tabClass = (active: boolean) =>
    active
      ? 'rounded-lg bg-[#0B1210] px-3.5 py-1.5 font-ui text-[13px] font-bold text-[#E8E4D8] shadow-none'
      : 'rounded-lg px-3.5 py-1.5 font-ui text-[13px] font-bold text-[#8A938C]'

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <section className="overflow-hidden rounded-[14px] border border-[#2A3A32] bg-[#121A18]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2A3A32] px-5 py-4">
            <div className="flex gap-1.5 rounded-[10px] bg-[#0B1210] p-1">
              <button type="button" className={tabClass(tab === 'proximos')} onClick={() => setTab('proximos')}>
                Próximos
              </button>
              <button type="button" className={tabClass(tab === 'resultados')} onClick={() => setTab('resultados')}>
                Resultados
              </button>
            </div>
            <Link href={orgPath('/admin/matches')} className="font-ui text-[13px] font-semibold text-org-primary hover:underline">
              Ver calendario completo →
            </Link>
          </div>
          <MatchRows rows={matches} orgPath={orgPath} />
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[22px] font-bold uppercase tracking-wide text-[#E8E4D8]">
              Accesos rápidos
            </h2>
            <span className="text-xs text-[#8A938C]">Administración del torneo</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tiles.map((t) => (
              <Link
                key={t.href}
                href={orgPath(t.href)}
                className="flex items-center gap-3.5 rounded-xl border border-[#2A3A32] bg-[#121A18] p-4 text-[#E8E4D8] transition hover:-translate-y-px hover:border-[#2A3A32] hover:bg-[#0B1210]"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#0B1210] font-display text-lg font-bold text-org-primary">
                  {t.tag}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold">{t.title}</div>
                  <div className="text-xs text-[#8A938C]">{t.meta}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-4">
        <section className="overflow-hidden rounded-[14px] border border-[#2A3A32] bg-[#121A18]">
          <div className="flex items-center justify-between px-5 pb-3 pt-4">
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-[#E8E4D8]">
              Tabla de posiciones
            </h2>
            <Link href={orgPath('/admin/teams')} className="text-xs font-semibold text-org-primary hover:underline">
              Completa
            </Link>
          </div>
          {standings.every((block) => block.rows.length === 0) ? (
            <p className="px-5 pb-5 text-sm text-[#8A938C]">Aún no hay resultados para calcular la tabla.</p>
          ) : (
            <div className="pb-2">
              {standings.map((block) => (
                <div key={block.categoryId} className="border-t border-[#2A3A32] first:border-t-0">
                  {standings.length > 1 && (
                    <h3 className="px-5 pt-4 text-sm font-bold uppercase tracking-wide text-[#8A938C]">
                      {block.name}
                    </h3>
                  )}
                  {block.rows.length === 0 ? (
                    <p className="px-5 py-3 text-sm text-[#8A938C]">Sin resultados en esta categoría.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-[26px_minmax(0,1fr)_34px_34px_34px] gap-2 px-5 pb-2 pt-3 text-[11px] font-bold uppercase tracking-wider text-[#8A938C]">
                        <span>#</span>
                        <span>Equipo</span>
                        <span className="text-center">PJ</span>
                        <span className="text-center">DG</span>
                        <span className="text-center">Pts</span>
                      </div>
                      {block.rows.map((s) => (
                        <div
                          key={`${block.categoryId}-${s.teamId}`}
                          className="grid grid-cols-[26px_minmax(0,1fr)_34px_34px_34px] items-center gap-2 border-t border-[#2A3A32] px-5 py-2.5 hover:bg-[#0B1210]"
                        >
                          <span className="text-[13px] font-bold" style={{ color: s.rankColor }}>
                            {s.rank}
                          </span>
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="h-[22px] w-[22px] shrink-0 rounded-full" style={{ background: s.color }} />
                            <span className="truncate text-[13px] font-semibold text-[#E8E4D8]">{s.team}</span>
                          </span>
                          <span className="text-center text-[13px] text-[#8A938C]">{s.pj}</span>
                          <span className="text-center text-[13px] text-[#8A938C]">{s.dg}</span>
                          <span className="font-data text-center text-lg font-bold text-[#E8E4D8]">{s.pts}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {scorers.length > 0 && (
          <section className="rounded-[14px] border border-[#2A3A32] bg-[#121A18] px-5 pb-2 pt-4">
            <h2 className="mb-1 font-display text-xl font-bold uppercase tracking-wide text-[#E8E4D8]">
              Goleadores
            </h2>
            {scorers.map((p, index) => (
              <div
                key={`${p.name}-${index}`}
                className="flex items-center gap-3 border-t border-[#2A3A32] py-2.5 first:border-t-0"
              >
                <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#0B1210] text-[11px] font-bold text-[#E8E4D8]">
                  {p.abbr}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-[#E8E4D8]">{p.name}</div>
                  <div className="text-[11px] text-[#8A938C]">{p.team}</div>
                </div>
                <div className="font-data text-xl font-bold text-[#E8E4D8]">{p.goals}</div>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-[14px] border border-[#2A3A32] bg-[#121A18] px-5 py-4">
          <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-wide text-[#E8E4D8]">Pendientes</h2>
          <div className="flex flex-col gap-2.5">
            {todos.map((t, index) => (
              <div
                key={`${t.title}-${index}`}
                className="flex items-start gap-3 rounded-[10px] border border-[#2A3A32] bg-[#0B1210] px-3 py-2.5"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: t.dot }} />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-pretty text-[#E8E4D8]">{t.title}</div>
                  <div className="text-xs text-[#8A938C]">{t.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

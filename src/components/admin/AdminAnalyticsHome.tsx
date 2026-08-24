'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashPageHeader } from '@/components/dashboard/dashboard-ui'
import { useOrgPath } from '@/hooks/useOrgPath'
import type {
  AnalyticsPersonStat,
  AnalyticsPeriod,
  OrgAnalyticsDashboard,
} from '@/lib/admin-analytics'

function showBlock(rows: readonly unknown[]): boolean {
  return rows.length > 0
}

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
  { value: 'all', label: 'Todo' },
]

function RankingTable({ title, rows }: { title: string; rows: AnalyticsPersonStat[] }) {
  const orgPath = useOrgPath()
  if (!showBlock(rows)) return null

  return (
    <div className="rounded-[18px] border border-[#2A3A32] bg-[#121A18]">
      <div className="border-b border-[#2A3A32] px-5 py-3">
        <h3 className="font-ui text-sm font-bold text-[#E8E4D8]">{title}</h3>
      </div>
      <ul className="divide-y divide-[#2A3A32]">
        {rows.map((row) => (
          <li key={`${title}-${row.playerId}`}>
            <Link
              href={orgPath('/admin/players')}
              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#0B1210]"
            >
              <span className="min-w-0 truncate font-ui text-sm font-semibold text-[#E8E4D8]">
                {row.name}
              </span>
              <span className="shrink-0 text-right">
                <span className="font-data text-lg font-bold text-org-primary">{row.value}</span>
                {row.meta ? (
                  <span className="ml-2 text-[11px] text-[#8A938C]">{row.meta}</span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminAnalyticsHome({ data }: { data: OrgAnalyticsDashboard }) {
  const orgPath = useOrgPath()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activePeriod = data.period

  function setPeriod(period: AnalyticsPeriod) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', period)
    router.push(orgPath(`/admin/estadisticas?${params.toString()}`))
  }

  const subtitleParts = [
    data.organizationName,
    data.periodLabel,
    `${data.matchCount} partido${data.matchCount === 1 ? '' : 's'}`,
  ]

  return (
    <div className="space-y-6">
      <DashPageHeader
        eyebrow="Analítica"
        title="Estadísticas"
        subtitle={subtitleParts.join(' · ')}
        actions={
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={
                  activePeriod === option.value
                    ? 'btn-kelme h-[42px] px-4 font-ui text-sm font-bold'
                    : 'inline-flex h-[42px] items-center rounded-xl border border-[#2A3A32] bg-transparent px-4 font-ui text-sm font-bold text-[#E8E4D8] hover:bg-[#121A18]'
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      {data.truncated ? (
        <p className="text-sm text-[#8A938C]">Mostrando los 200 partidos más recientes.</p>
      ) : null}

      {data.matchCount === 0 ? (
        <div className="rounded-[18px] border border-[#2A3A32] bg-[#121A18] p-10 text-center">
          <p className="font-ui text-sm text-[#8A938C]">
            No hay partidos en {data.periodLabel}.
          </p>
          <Link
            href={orgPath('/admin/matches')}
            className="btn-kelme mt-4 inline-flex rounded-[10px] px-4 py-2 font-ui text-sm font-semibold"
          >
            Ir a partidos
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.kpis.map((k) => (
              <div
                key={k.label}
                className="rounded-[18px] border border-[#2A3A32] bg-[#121A18] px-5 py-[18px]"
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wide text-[#8A938C]">
                    {k.label}
                  </span>
                  <span className="rounded-full bg-[#0B1210] px-2 py-0.5 text-[11px] font-bold text-[#8A938C]">
                    {k.delta}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-data text-[40px] font-black leading-none text-[#E8E4D8]">
                    {k.value}
                  </span>
                  <span className="text-[13px] font-semibold text-[#8A938C]">{k.unit}</span>
                </div>
                <div className="mt-2 text-[11px] text-[#8A938C]">{k.foot}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {data.nextMatch ? (
              <div className="rounded-[18px] border border-[#2A3A32] bg-[#121A18] p-5">
                <h3 className="font-ui text-sm font-bold text-[#E8E4D8]">Próximo partido</h3>
                <Link
                  href={orgPath(`/live/${data.nextMatch.id}`)}
                  className="mt-3 block rounded-xl border border-[#2A3A32] bg-[#0B1210] p-4 hover:border-org-primary"
                >
                  <p className="font-ui text-base font-bold text-[#E8E4D8]">{data.nextMatch.label}</p>
                  <p className="mt-1 text-sm text-[#8A938C]">{data.nextMatch.when}</p>
                  <p className="mt-1 text-sm text-[#8A938C]">{data.nextMatch.venue}</p>
                  <div className="mt-3 grid gap-1 text-sm text-[#8A938C]">
                    <p>
                      Cupos A/B: {data.nextMatch.sideACount}/{data.nextMatch.sideBCount}
                    </p>
                    <p>
                      Pagos: {data.nextMatch.paidCount}/{data.nextMatch.rosterCount}
                    </p>
                    <p>DT: {data.nextMatch.hasCoach ? 'Designado' : 'Falta designar'}</p>
                    <p>
                      Galleta: {data.nextMatch.galletaName ?? 'Sin designar'}
                    </p>
                    <p>
                      Clima:{' '}
                      {data.nextMatch.weatherLine ?? 'Sin clima (falta comuna)'}
                    </p>
                  </div>
                </Link>
              </div>
            ) : null}

            <div className="rounded-[18px] border border-[#2A3A32] bg-[#121A18] p-5">
              <h3 className="font-ui text-sm font-bold text-[#E8E4D8]">Operación</h3>
              {showBlock(data.pending) ? (
                <ul className="mt-3 space-y-2">
                  {data.pending.map((item) => (
                    <li key={item.title}>
                      <Link
                        href={orgPath(item.href)}
                        className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-[#0B1210]"
                      >
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background: item.tone === 'danger' ? '#b91c1c' : '#f59e0b',
                          }}
                        />
                        <span className="text-sm font-semibold text-[#E8E4D8]">{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[#8A938C]">Sin pendientes urgentes.</p>
              )}
              {showBlock(data.unpaid) ? (
                <div className="mt-4 border-t border-[#2A3A32] pt-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#8A938C]">
                    Impagos
                  </p>
                  <ul className="space-y-1">
                    {data.unpaid.map((row) => (
                      <li key={row.playerId}>
                        <Link
                          href={orgPath('/admin/players')}
                          className="flex justify-between text-sm text-[#E8E4D8] hover:text-org-primary"
                        >
                          <span>{row.name}</span>
                          <span className="text-[#8A938C]">{row.meta}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          {data.weekly.length >= 2 ? (
            <div className="rounded-[18px] border border-[#2A3A32] bg-[#121A18] p-5">
              <h3 className="font-ui text-sm font-bold text-[#E8E4D8]">Tendencia semanal</h3>
              <div className="mt-4 flex items-end gap-3 overflow-x-auto pb-2">
                {data.weekly.map((bucket) => {
                  const maxMatches = Math.max(...data.weekly.map((b) => b.matches), 1)
                  const height = Math.round((bucket.matches / maxMatches) * 120)
                  return (
                    <div key={bucket.weekLabel} className="flex min-w-[72px] flex-col items-center gap-2">
                      <span className="font-data text-xs font-bold text-[#E8E4D8]">
                        {bucket.matches}
                      </span>
                      <div
                        className="w-10 rounded-t-md bg-org-primary"
                        style={{ height: `${Math.max(height, 8)}px` }}
                        title={`${bucket.goals} goles`}
                      />
                      <span className="text-center text-[10px] leading-tight text-[#8A938C]">
                        {bucket.weekLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {data.weatherPeriod ? (
            <div className="rounded-[18px] border border-[#2A3A32] bg-[#121A18] p-5">
              <h3 className="font-ui text-sm font-bold text-[#E8E4D8]">Clima del período</h3>
              <div className="mt-3 flex flex-wrap gap-6">
                <div>
                  <p className="text-[11px] uppercase text-[#8A938C]">Promedio</p>
                  <p className="font-data text-2xl font-bold text-[#E8E4D8]">
                    {data.weatherPeriod.avgTempC}°C
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-[#8A938C]">Mín / Máx</p>
                  <p className="font-data text-2xl font-bold text-[#E8E4D8]">
                    {data.weatherPeriod.minTempC}° / {data.weatherPeriod.maxTempC}°
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.weatherPeriod.topLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-[#0B1210] px-3 py-1 text-xs font-bold text-[#E8E4D8]"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <RankingTable title="Goleadores" rows={data.rankings.scorers} />
            <RankingTable title="Asistencias" rows={data.rankings.assists} />
            <RankingTable title="Más partidos" rows={data.rankings.appearances} />
            <RankingTable title="Galleta" rows={data.rankings.galleta} />
            <RankingTable title="MVP" rows={data.rankings.mvp} />
            <RankingTable title="DTs" rows={data.rankings.coaches} />
            <RankingTable title="Fair play" rows={data.rankings.cards} />
          </div>

          {data.league.visible ? (
            <div className="rounded-[18px] border border-[#2A3A32] bg-[#121A18] p-5">
              <h3 className="font-ui text-sm font-bold text-[#E8E4D8]">Liga en el período</h3>
              {showBlock(data.league.standingsPreview) ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase text-[#8A938C]">
                        <th className="py-2 pr-4">Equipo</th>
                        <th className="py-2 pr-4">Pts</th>
                        <th className="py-2 pr-4">GF</th>
                        <th className="py-2">GC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.league.standingsPreview.map((row) => (
                        <tr key={row.team} className="border-t border-[#2A3A32]">
                          <td className="py-2 pr-4 font-semibold text-[#E8E4D8]">{row.team}</td>
                          <td className="py-2 pr-4 font-data text-[#E8E4D8]">{row.pts}</td>
                          <td className="py-2 pr-4 font-data text-[#8A938C]">{row.gf}</td>
                          <td className="py-2 font-data text-[#8A938C]">{row.gc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <div className="mt-4">
                <RankingTable title="Goleadores liga" rows={data.league.scorers} />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

import Link from 'next/link'
import { AdminDashboardPanels } from '@/components/admin/AdminDashboardPanels'
import { AdminSeasonSelect } from '@/components/admin/AdminSeasonSelect'
import type { AdminDashboardData } from '@/lib/admin-dashboard'

export function AdminDashboardHome({ data }: { data: AdminDashboardData }) {
  const activeSeason = data.seasons.find((s) => s.id === data.seasonId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
              Panel de administración
            </span>
            {activeSeason?.isActive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                ● Temporada en curso
              </span>
            )}
          </div>
          <h1 className="font-display text-4xl font-bold leading-none tracking-tight text-zinc-900">
            {data.seasonTitle}
          </h1>
          <p className="mt-2 text-sm text-pretty text-zinc-500">{data.seasonSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <AdminSeasonSelect seasons={data.seasons} value={data.seasonId} />
          <Link
            href="/admin/matches"
            className="inline-flex h-[42px] items-center rounded-[10px] border border-zinc-200 bg-white px-4 font-ui text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
          >
            Exportar
          </Link>
          <Link
            href="/admin/matches"
            className="inline-flex h-[42px] items-center rounded-[10px] bg-[#b91c1c] px-[18px] font-ui text-sm font-bold text-white shadow-[0_1px_2px_rgba(185,28,44,0.35)] hover:bg-[#9f1728]"
          >
            + Programar partido
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k) => (
          <div key={k.label} className="rounded-[14px] border border-zinc-200 bg-white px-5 py-[18px]">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{k.label}</span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-600">
                {k.delta}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[38px] font-bold leading-none">{k.value}</span>
              <span className="text-[13px] text-zinc-500">{k.unit}</span>
            </div>
            <div className="mt-3.5 h-[5px] overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-[#b91c1c]" style={{ width: k.pct }} />
            </div>
            <div className="mt-2 text-xs text-zinc-400">{k.foot}</div>
          </div>
        ))}
      </div>

      <AdminDashboardPanels
        upcoming={data.upcoming}
        results={data.results}
        standings={data.standings}
        scorers={data.scorers}
        tiles={data.tiles}
        todos={data.todos}
      />
    </div>
  )
}

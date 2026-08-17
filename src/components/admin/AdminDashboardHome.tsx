'use client'

import Link from 'next/link'
import { AdminDashboardPanels } from '@/components/admin/AdminDashboardPanels'
import { AdminSeasonSelect } from '@/components/admin/AdminSeasonSelect'
import { useOrgPath } from '@/hooks/useOrgPath'
import type { AdminDashboardData } from '@/lib/admin-dashboard'

export function AdminDashboardHome({ data }: { data: AdminDashboardData }) {
  const orgPath = useOrgPath()
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
            href={orgPath('/admin/matches')}
            className="inline-flex h-[42px] items-center rounded-xl border border-[#dddde2] bg-white px-4 font-ui text-sm font-bold text-[#34343a] hover:bg-[#f7f7f9]"
          >
            Exportar
          </Link>
          <Link
            href={orgPath('/admin/matches')}
            className="inline-flex h-[42px] items-center rounded-xl bg-[#c91f26] px-[18px] font-ui text-sm font-extrabold text-white shadow-[0_6px_14px_#c91f2630] hover:bg-[#b01b22]"
          >
            + Programar partido
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k) => (
          <div key={k.label} className="rounded-[18px] border border-[#e5e5e9] bg-white px-5 py-[18px]">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wide text-[#999]">
                {k.label}
              </span>
              <span className="rounded-full bg-[#f4f4f6] px-2 py-0.5 text-[11px] font-bold text-[#777]">
                {k.delta}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[40px] font-black leading-none">{k.value}</span>
              <span className="text-[13px] font-semibold text-[#777]">{k.unit}</span>
            </div>
            <div className="mt-3.5 h-[5px] overflow-hidden rounded-full bg-[#f0f0f2]">
              <div className="h-full rounded-full bg-[#c91f26]" style={{ width: k.pct }} />
            </div>
            <div className="mt-2 text-[11px] text-[#aaa]">{k.foot}</div>
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

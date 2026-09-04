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
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A938C]">
              Panel de administración
            </span>
            {activeSeason?.isActive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0B1210] px-2.5 py-0.5 text-[11px] font-bold text-[#3D8B6E]">
                ● Temporada en curso
              </span>
            )}
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase leading-none tracking-wide text-[#E8E4D8]">
            {data.seasonTitle}
          </h1>
          <p className="mt-2 text-sm text-pretty text-[#8A938C]">{data.seasonSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <AdminSeasonSelect seasons={data.seasons} value={data.seasonId} />
          <Link
            href={orgPath('/admin/estadisticas')}
            className="inline-flex h-[42px] items-center rounded-xl border border-[#2A3A32] bg-transparent px-4 font-ui text-sm font-bold text-[#E8E4D8] hover:bg-[#121A18]"
          >
            Ver estadísticas
          </Link>
          <Link
            href={orgPath('/admin/matches')}
            className="btn-kelme inline-flex h-[42px] items-center px-[18px]"
          >
            + Programar partido
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k) => (
          <div key={k.label} className="rounded-[18px] border border-[#2A3A32] bg-[#121A18] px-5 py-[18px]">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wide text-[#8A938C]">
                {k.label}
              </span>
              <span className="rounded-full bg-[#0B1210] px-2 py-0.5 text-[11px] font-bold text-[#8A938C]">
                {k.delta}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-data text-[40px] font-black leading-none text-[#E8E4D8]">{k.value}</span>
              <span className="text-[13px] font-semibold text-[#8A938C]">{k.unit}</span>
            </div>
            <div className="mt-3.5 h-[5px] overflow-hidden rounded-full bg-[#0B1210]">
              <div className="h-full rounded-full bg-org-primary" style={{ width: k.pct }} />
            </div>
            <div className="mt-2 text-[11px] text-[#8A938C]">{k.foot}</div>
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

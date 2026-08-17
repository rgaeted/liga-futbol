import { db } from '@/lib/db'
import { PlatformPageHeader, PlatformPanel, PlatformPanelInner } from '@/components/plataforma/platform-ui'

export const dynamic = 'force-dynamic'

export default async function PlataformaAppsPage() {
  const rows = await db.seasonMobileConfig.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      season: {
        select: {
          name: true,
          organization: { select: { name: true, slug: true } },
        },
      },
    },
  })

  return (
    <>
      <PlatformPageHeader
        eyebrow="Plataforma"
        title="Apps móviles"
        subtitle="Inventario de ediciones móviles configuradas por temporada."
        status={`● ${rows.length} ediciones`}
      />

      <PlatformPanel>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-[#e5e5e9] bg-[#fafafa] text-left text-[#999]">
              <tr>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wide">Empresa</th>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wide">Temporada</th>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wide">Slug</th>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wide">Publicado</th>
                <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wide">Scaffold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f2]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-[#8e8e98]">
                    Aún no hay ediciones móviles configuradas.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.seasonId} className="hover:bg-[#fafafa]">
                    <td className="px-5 py-3.5 font-semibold text-[#17171a]">
                      {row.season.organization.name}
                    </td>
                    <td className="px-5 py-3.5 text-[#505058]">{row.season.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#777]">{row.slug}</td>
                    <td className="px-5 py-3.5 text-[#505058]">{row.isPublished ? 'Sí' : 'No'}</td>
                    <td className="px-5 py-3.5 text-[#999]">Scaffold pendiente</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PlatformPanel>
    </>
  )
}

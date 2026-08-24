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
            <thead className="border-b border-[#2A3A32] bg-[#0B1210] text-left text-[#8A938C]">
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
                  <tr key={row.seasonId} className="hover:bg-[#0B1210]">
                    <td className="px-5 py-3.5 font-semibold text-[#E8E4D8]">
                      {row.season.organization.name}
                    </td>
                    <td className="px-5 py-3.5 text-[#8A938C]">{row.season.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#8A938C]">{row.slug}</td>
                    <td className="px-5 py-3.5 text-[#8A938C]">{row.isPublished ? 'Sí' : 'No'}</td>
                    <td className="px-5 py-3.5 text-[#8A938C]">Scaffold pendiente</td>
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

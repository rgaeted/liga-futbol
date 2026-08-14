import { db } from '@/lib/db'

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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-zinc-900">Apps móviles</h1>
        <p className="mt-1 font-ui text-sm text-zinc-600">
          Inventario de ediciones móviles configuradas por temporada.
        </p>
      </div>

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-100 text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Temporada</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Publicado</th>
              <th className="px-4 py-3 font-medium">Scaffold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-zinc-500">
                  Aún no hay ediciones móviles configuradas.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.seasonId}>
                  <td className="px-4 py-3">{row.season.organization.name}</td>
                  <td className="px-4 py-3">{row.season.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.slug}</td>
                  <td className="px-4 py-3">{row.isPublished ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-3 text-zinc-500">Scaffold pendiente</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

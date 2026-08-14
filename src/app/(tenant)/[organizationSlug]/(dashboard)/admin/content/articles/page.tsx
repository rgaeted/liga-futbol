import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArticlesTable } from '@/components/admin/content/ArticlesTable'
import { ContentSeasonBar } from '@/components/admin/content/ContentSeasonBar'
import { db } from '@/lib/db'
import { orgPath } from '@/lib/tenant-paths'

export default async function AdminArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const { organizationSlug } = await params
  const query = await searchParams
  const seasons = await db.season.findMany({ orderBy: { startDate: 'desc' } })
  const selectedSeasonId = query.season ?? seasons[0]?.id ?? null
  if (!selectedSeasonId && seasons.length > 0) {
    redirect(orgPath(organizationSlug, `/admin/content/articles?season=${seasons[0].id}`))
  }

  const articles = selectedSeasonId
    ? await db.article.findMany({
        where: { seasonId: selectedSeasonId },
        orderBy: { updatedAt: 'desc' },
      })
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Noticias</h1>
        {selectedSeasonId ? (
          <Link
            href={orgPath(organizationSlug, `/admin/content/articles/new?season=${selectedSeasonId}`)}
            className="rounded-xl bg-kelme-red px-4 py-2 text-sm font-semibold text-white"
          >
            Nueva noticia
          </Link>
        ) : null}
      </div>
      <ContentSeasonBar
        seasons={seasons.map((season) => ({ id: season.id, name: season.name }))}
        selectedSeasonId={selectedSeasonId}
      />
      {selectedSeasonId ? (
        <ArticlesTable
          seasonId={selectedSeasonId}
          articles={articles.map((article) => ({
            id: article.id,
            title: article.title,
            status: article.status,
            publishedAt: article.publishedAt?.toISOString() ?? null,
            updatedAt: article.updatedAt.toISOString(),
          }))}
        />
      ) : null}
    </div>
  )
}

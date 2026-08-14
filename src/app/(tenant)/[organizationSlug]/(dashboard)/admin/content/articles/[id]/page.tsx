import { notFound, redirect } from 'next/navigation'
import { ArticleForm } from '@/components/admin/content/ArticlesTable'
import { ContentSeasonBar } from '@/components/admin/content/ContentSeasonBar'
import { EditorialImageUpload } from '@/components/admin/content/EditorialImageUpload'
import { db } from '@/lib/db'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import { orgPath } from '@/lib/tenant-paths'

export default async function AdminArticleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string; id: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const { organizationSlug, id } = await params
  const query = await searchParams
  const seasons = await db.season.findMany({ orderBy: { startDate: 'desc' } })

  if (id === 'new') {
    const selectedSeasonId = query.season ?? seasons[0]?.id
    if (!selectedSeasonId) redirect(orgPath(organizationSlug, '/admin/content/articles'))
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Nueva noticia</h1>
        <ContentSeasonBar
          seasons={seasons.map((season) => ({ id: season.id, name: season.name }))}
          selectedSeasonId={selectedSeasonId}
        />
        <ArticleForm seasonId={selectedSeasonId} />
      </div>
    )
  }

  const article = await db.article.findUnique({ where: { id } })
  if (!article) notFound()
  const selectedSeasonId = query.season ?? article.seasonId

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Editar noticia</h1>
      <ContentSeasonBar
        seasons={seasons.map((season) => ({ id: season.id, name: season.name }))}
        selectedSeasonId={selectedSeasonId}
      />
      <ArticleForm
        seasonId={article.seasonId}
        articleId={article.id}
        initial={{
          title: article.title,
          summary: article.summary ?? '',
          body: article.body,
          status: article.status,
        }}
      />
      <EditorialImageUpload
        label="Portada"
        fieldName="cover"
        uploadUrl={`/api/admin/seasons/${article.seasonId}/articles/${article.id}/cover`}
        deleteUrl={`/api/admin/seasons/${article.seasonId}/articles/${article.id}/cover`}
        previewUrl={editorialPublicUrl(article.coverStoragePath)}
      />
    </div>
  )
}
